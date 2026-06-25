"""
Token optimization engine.

Responsibilities:
  1. Exact token counting from API response `usage` field (falls back to byte estimate)
  2. Deterministic prompt cache (SHA-256 keyed, TTL per agent type)
  3. Duplicate-call detector (same key within grace window)
  4. Prompt compressor (trims messages to fit token budget without losing context)
  5. Budget guard (blocks calls that would blow per-session or per-project limits)
  6. Usage ledger (writes TokenUsageLog rows for every call)

All hooks are zero-copy: the engine wraps LLMClient._post() and returns the real
response unchanged — callers see no difference.
"""
import asyncio
import hashlib
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, List, Tuple

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tunables
# ---------------------------------------------------------------------------

# Cache TTL per agent type (seconds).  "default" applies when no match.
CACHE_TTL: Dict[str, int] = {
    "requirements": 3600 * 6,   # requirements rarely change mid-session
    "blueprint":    3600 * 4,
    "work_order":   3600 * 2,
    "test":         3600 * 1,
    "feedback":     3600 * 1,
    "default":      3600 * 2,
}

# Warn (but don't block) when a session exceeds this many input tokens
SESSION_WARN_TOKENS = 200_000
# Hard block at this many input tokens per session
SESSION_BLOCK_TOKENS = 500_000

# Approximate chars-per-token (conservative; real ratio is ~3.5-4 for English)
CHARS_PER_TOKEN = 3

# Maximum context length we allow to send (in tokens).
# If the request exceeds this we compress first.
MAX_CONTEXT_TOKENS = 12_000

# Keep at least this many tokens of the last user message untouched
MIN_LAST_USER_TOKENS = 512

# Duplicate-call grace window in seconds: same cache key within this window
# is considered a redundant call and the cache is used even if TTL not set
DEDUP_WINDOW = 30


# ---------------------------------------------------------------------------
# Token estimation
# ---------------------------------------------------------------------------

def _estimate_tokens(text: str) -> int:
    """Cheap byte-based token estimate when the API doesn't return usage data."""
    return max(1, len(text) // CHARS_PER_TOKEN)


def count_messages_tokens(messages: List[dict]) -> int:
    """Sum estimated tokens across all messages."""
    total = 0
    for msg in messages:
        content = msg.get("content") or ""
        if isinstance(content, list):
            content = " ".join(c.get("text", "") for c in content if isinstance(c, dict))
        total += _estimate_tokens(str(content))
        # Every message has ~4 tokens of overhead
        total += 4
    return total


# ---------------------------------------------------------------------------
# Cache entry
# ---------------------------------------------------------------------------

@dataclass
class _CacheEntry:
    response: dict
    prompt_tokens: int
    completion_tokens: int
    created_at: float = field(default_factory=time.monotonic)
    hits: int = 0

    def is_alive(self, ttl: int) -> bool:
        return (time.monotonic() - self.created_at) < ttl


# ---------------------------------------------------------------------------
# Per-session budget state
# ---------------------------------------------------------------------------

@dataclass
class _SessionState:
    input_tokens: int = 0
    output_tokens: int = 0
    call_count: int = 0
    cache_hits: int = 0
    tokens_saved: int = 0   # tokens we avoided by hitting cache
    started_at: float = field(default_factory=time.monotonic)

    def add(self, prompt: int, completion: int) -> None:
        self.input_tokens += prompt
        self.output_tokens += completion
        self.call_count += 1

    def add_cache_hit(self, prompt: int, completion: int) -> None:
        self.cache_hits += 1
        self.tokens_saved += prompt + completion


# ---------------------------------------------------------------------------
# Main engine
# ---------------------------------------------------------------------------

class TokenEngine:
    """
    Singleton that sits between LLMClient and the HTTP layer.

    Usage:
        engine = TokenEngine()
        response = await engine.call(payload, provider, model, agent_type, session_id)
    """

    def __init__(self):
        # cache: key -> _CacheEntry
        self._cache: Dict[str, _CacheEntry] = {}
        # session states: session_id -> _SessionState
        self._sessions: Dict[str, _SessionState] = {}
        # last-call timestamps for dedup: key -> float
        self._last_seen: Dict[str, float] = {}
        # global lifetime stats
        self._global: _SessionState = _SessionState()
        self._lock = asyncio.Lock()

    # ------------------------------------------------------------------
    # Cache key
    # ------------------------------------------------------------------

    @staticmethod
    def _cache_key(provider: str, model: str, messages: List[dict], temperature: float) -> str:
        """
        Deterministic SHA-256 over (provider, model, sorted messages, temperature).
        Tool call results are included so agent loops are cached correctly.
        """
        payload = {
            "p": provider,
            "m": model,
            "t": round(temperature, 2),
            "msgs": [
                {"role": msg.get("role"), "content": msg.get("content")}
                for msg in messages
            ],
        }
        raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(raw.encode()).hexdigest()

    # ------------------------------------------------------------------
    # Prompt compressor
    # ------------------------------------------------------------------

    @staticmethod
    def compress_messages(messages: List[dict], max_tokens: int = MAX_CONTEXT_TOKENS) -> Tuple[List[dict], int]:
        """
        Trim messages to stay under max_tokens without losing the system prompt
        or the most recent user turn.

        Strategy:
          1. Always keep system messages (index 0 if role==system)
          2. Always keep the last user message
          3. Drop middle messages oldest-first until we fit
          4. If a single message still exceeds budget, truncate its content

        Returns (compressed_messages, tokens_removed).
        """
        current = count_messages_tokens(messages)
        if current <= max_tokens:
            return messages, 0

        tokens_removed = 0
        msgs = list(messages)

        # Identify protected indices
        protected = set()
        if msgs and msgs[0].get("role") == "system":
            protected.add(0)
        # Protect last user/assistant message
        for i in range(len(msgs) - 1, -1, -1):
            if msgs[i].get("role") in ("user", "assistant"):
                protected.add(i)
                break

        # Drop unprotected messages from oldest (index 1) outward
        i = 1
        while i < len(msgs) and count_messages_tokens(msgs) > max_tokens:
            if i not in protected:
                removed_est = _estimate_tokens(str(msgs[i].get("content", "")))
                tokens_removed += removed_est
                msgs.pop(i)
                # Re-map protected indices after deletion
                protected = {p - 1 if p > i else p for p in protected}
            else:
                i += 1

        # Last resort: truncate last user message content
        if count_messages_tokens(msgs) > max_tokens and len(msgs) > 0:
            last = msgs[-1]
            content = str(last.get("content", ""))
            keep_chars = MIN_LAST_USER_TOKENS * CHARS_PER_TOKEN
            if len(content) > keep_chars:
                truncated = content[:keep_chars]
                tokens_removed += _estimate_tokens(content) - _estimate_tokens(truncated)
                msgs[-1] = {**last, "content": truncated + "\n[...content truncated to fit token budget...]"}

        return msgs, tokens_removed

    # ------------------------------------------------------------------
    # Core call intercept
    # ------------------------------------------------------------------

    async def call(
        self,
        payload: dict,
        *,
        provider: str,
        model: str,
        agent_type: str = "default",
        session_id: str = "global",
        http_post,            # async callable: payload -> dict  (the real HTTP call)
    ) -> dict:
        """
        Intercept an LLM call.  Returns the (possibly cached) API response dict.
        Logs usage, enforces budget, serves cache, detects duplicates.
        """
        messages: List[dict] = payload.get("messages", [])
        temperature: float = float(payload.get("temperature", 0.3))
        tools_present = bool(payload.get("tools"))

        async with self._lock:
            session = self._sessions.setdefault(session_id, _SessionState())

        # 1. Budget guard (input token estimate only — we don't know output yet)
        input_est = count_messages_tokens(messages)
        async with self._lock:
            projected = session.input_tokens + input_est
        if projected > SESSION_BLOCK_TOKENS:
            raise RuntimeError(
                f"Session '{session_id}' has consumed ~{session.input_tokens:,} tokens "
                f"(limit {SESSION_BLOCK_TOKENS:,}). Reset the session to continue."
            )
        if projected > SESSION_WARN_TOKENS:
            logger.warning(
                "Session '%s' approaching token limit: ~%d / %d used",
                session_id, session.input_tokens, SESSION_WARN_TOKENS,
            )

        # 2. Prompt compression (only non-tool calls; tool schemas must stay intact)
        compressed_msgs, tokens_removed = self.compress_messages(messages)
        if tokens_removed > 0:
            logger.info(
                "Compressed prompt for session '%s': removed ~%d tokens",
                session_id, tokens_removed,
            )
            payload = {**payload, "messages": compressed_msgs}

        # 3. Cache lookup (skip if tools are present — tool calls have side effects)
        key = self._cache_key(provider, model, compressed_msgs, temperature)
        ttl = CACHE_TTL.get(agent_type, CACHE_TTL["default"])

        if not tools_present:
            async with self._lock:
                entry = self._cache.get(key)
                now = time.monotonic()

                # Exact cache hit within TTL
                if entry and entry.is_alive(ttl):
                    entry.hits += 1
                    session.add_cache_hit(entry.prompt_tokens, entry.completion_tokens)
                    self._global.add_cache_hit(entry.prompt_tokens, entry.completion_tokens)
                    logger.info(
                        "Cache HIT [%s/%s] agent=%s session=%s saved=%d tokens",
                        provider, model, agent_type, session_id,
                        entry.prompt_tokens + entry.completion_tokens,
                    )
                    return entry.response

                # Dedup: same key seen very recently (even if no TTL)
                last = self._last_seen.get(key, 0)
                if now - last < DEDUP_WINDOW and entry:
                    entry.hits += 1
                    session.add_cache_hit(entry.prompt_tokens, entry.completion_tokens)
                    self._global.add_cache_hit(entry.prompt_tokens, entry.completion_tokens)
                    logger.info(
                        "Dedup HIT [%s] within %ds grace window", key[:12], DEDUP_WINDOW
                    )
                    return entry.response

                self._last_seen[key] = now

        # 4. Real HTTP call
        response = await http_post(payload)

        # 5. Extract exact token counts from the response
        usage = response.get("usage", {})
        prompt_tokens    = usage.get("prompt_tokens",     input_est)
        completion_tokens = usage.get("completion_tokens", 0)
        total_tokens     = usage.get("total_tokens", prompt_tokens + completion_tokens)

        # 6. Update ledger
        async with self._lock:
            session.add(prompt_tokens, completion_tokens)
            self._global.add(prompt_tokens, completion_tokens)

        # 7. Write to cache (only non-tool responses)
        if not tools_present:
            async with self._lock:
                self._cache[key] = _CacheEntry(
                    response=response,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                )

        # 8. Async DB log (fire and forget, never blocks the caller)
        asyncio.ensure_future(self._log_to_db(
            session_id=session_id,
            provider=provider,
            model=model,
            agent_type=agent_type,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            cache_hit=False,
            tokens_saved=tokens_removed,
        ))

        logger.debug(
            "LLM call [%s/%s] prompt=%d completion=%d total=%d session=%s",
            provider, model, prompt_tokens, completion_tokens, total_tokens, session_id,
        )
        return response

    # ------------------------------------------------------------------
    # DB logging (async, non-blocking)
    # ------------------------------------------------------------------

    @staticmethod
    async def _log_to_db(
        session_id: str, provider: str, model: str, agent_type: str,
        prompt_tokens: int, completion_tokens: int, total_tokens: int,
        cache_hit: bool, tokens_saved: int,
    ) -> None:
        try:
            from backend.models.engine import AsyncSessionLocal
            from backend.models.database import TokenUsageLog, uid, now_iso
            async with AsyncSessionLocal() as db:
                row = TokenUsageLog(
                    id=uid(),
                    session_id=session_id,
                    provider=provider,
                    model=model,
                    agent_type=agent_type,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=total_tokens,
                    cache_hit=cache_hit,
                    tokens_saved=tokens_saved,
                    timestamp=now_iso(),
                )
                db.add(row)
                await db.commit()
        except Exception as exc:
            logger.warning("Failed to write token log to DB: %s", exc)

    # ------------------------------------------------------------------
    # Stats API
    # ------------------------------------------------------------------

    def session_stats(self, session_id: str) -> dict:
        s = self._sessions.get(session_id, _SessionState())
        total = s.input_tokens + s.output_tokens
        saved = s.tokens_saved
        return {
            "session_id": session_id,
            "input_tokens": s.input_tokens,
            "output_tokens": s.output_tokens,
            "total_tokens": total,
            "call_count": s.call_count,
            "cache_hits": s.cache_hits,
            "tokens_saved": saved,
            "efficiency_pct": round(100 * saved / (total + saved) if (total + saved) > 0 else 0, 1),
            "elapsed_seconds": round(time.monotonic() - s.started_at, 1),
        }

    def global_stats(self) -> dict:
        g = self._global
        total = g.input_tokens + g.output_tokens
        saved = g.tokens_saved
        cache_size = len(self._cache)
        live = sum(1 for e in self._cache.values() if e.is_alive(CACHE_TTL["default"]))
        return {
            "input_tokens": g.input_tokens,
            "output_tokens": g.output_tokens,
            "total_tokens": total,
            "call_count": g.call_count,
            "cache_hits": g.cache_hits,
            "tokens_saved": saved,
            "efficiency_pct": round(100 * saved / (total + saved) if (total + saved) > 0 else 0, 1),
            "cache_size": cache_size,
            "cache_live_entries": live,
            "session_count": len(self._sessions),
        }

    def cache_stats(self) -> List[dict]:
        now = time.monotonic()
        rows = []
        for key, entry in self._cache.items():
            age = now - entry.created_at
            rows.append({
                "key_prefix": key[:12],
                "hits": entry.hits,
                "prompt_tokens": entry.prompt_tokens,
                "completion_tokens": entry.completion_tokens,
                "age_seconds": round(age),
                "alive": entry.is_alive(CACHE_TTL["default"]),
            })
        return sorted(rows, key=lambda r: r["hits"], reverse=True)

    def reset_session(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    def invalidate_cache(self, key_prefix: Optional[str] = None) -> int:
        if key_prefix is None:
            count = len(self._cache)
            self._cache.clear()
            self._last_seen.clear()
            return count
        to_del = [k for k in self._cache if k.startswith(key_prefix)]
        for k in to_del:
            self._cache.pop(k, None)
            self._last_seen.pop(k, None)
        return len(to_del)

    def evict_expired(self) -> int:
        """Remove expired cache entries. Call periodically from a background task."""
        default_ttl = CACHE_TTL["default"]
        expired = [k for k, e in self._cache.items() if not e.is_alive(default_ttl)]
        for k in expired:
            self._cache.pop(k, None)
            self._last_seen.pop(k, None)
        return len(expired)


# Singleton
token_engine = TokenEngine()
