"""Security middleware: rate limiting, security headers, request size enforcement."""
import time
import logging
from collections import defaultdict
from typing import Dict, List

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds defensive HTTP headers to every response."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        h = response.headers
        h["X-Content-Type-Options"] = "nosniff"
        h["X-Frame-Options"] = "DENY"
        h["X-XSS-Protection"] = "1; mode=block"
        h["Referrer-Policy"] = "strict-origin-when-cross-origin"
        h["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        h["Cache-Control"] = "no-store"
        # Don't set HSTS here — that's the reverse proxy's job
        return response


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Rejects bodies above a configurable limit before they reach route handlers."""

    def __init__(self, app, max_bytes: int = 1 * 1024 * 1024):  # 1 MB default
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_bytes:
            return JSONResponse(
                {"detail": f"Request body too large (max {self.max_bytes // 1024}KB)"},
                status_code=413,
            )
        return await call_next(request)


class InMemoryRateLimiter:
    """
    Token-bucket rate limiter keyed by client IP.
    Thread-safe for asyncio (single-threaded event loop).
    """

    def __init__(self, max_calls: int, window_seconds: float):
        self.max_calls = max_calls
        self.window = window_seconds
        self._buckets: Dict[str, List[float]] = defaultdict(list)

    def _client_key(self, request: Request) -> str:
        # Trust X-Forwarded-For only if set — otherwise use direct connection
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def check(self, request: Request) -> None:
        key = self._client_key(request)
        now = time.monotonic()
        bucket = self._buckets[key]
        # Evict expired timestamps
        self._buckets[key] = [t for t in bucket if now - t < self.window]
        if len(self._buckets[key]) >= self.max_calls:
            retry_after = int(self.window - (now - self._buckets[key][0])) + 1
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please slow down.",
                headers={"Retry-After": str(retry_after)},
            )
        self._buckets[key].append(now)


# Shared limiter instances — imported and used as FastAPI dependencies
ai_limiter = InMemoryRateLimiter(max_calls=20, window_seconds=60)   # 20 AI calls/min per IP
api_limiter = InMemoryRateLimiter(max_calls=200, window_seconds=60)  # 200 CRUD calls/min per IP
