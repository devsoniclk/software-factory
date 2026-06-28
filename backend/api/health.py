"""Health check endpoints."""
from fastapi import APIRouter, HTTPException, Request
from backend.config.settings import settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {"status": "ok", "service": "1024-studio", "version": "0.1.0"}


@router.get("/health/api-key")
async def get_api_key(request: Request):
    """Bootstrap endpoint: return the API key to localhost callers only."""
    client_host = request.client.host if request.client else ""
    if client_host not in ("127.0.0.1", "::1", "localhost"):
        raise HTTPException(status_code=403, detail="Forbidden")
    return {"api_key": settings.api_key}
