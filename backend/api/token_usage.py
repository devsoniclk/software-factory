"""Token usage and cache analytics endpoints."""
import csv
import io
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from backend.models.engine import get_db
from backend.models.database import TokenUsageLog
from backend.services.token_engine import token_engine, CACHE_TTL, SESSION_WARN_TOKENS, SESSION_BLOCK_TOKENS

router = APIRouter(prefix="/token-usage", tags=["token-usage"])


@router.get("/global")
async def global_stats():
    """In-memory global stats since last restart."""
    return token_engine.global_stats()


@router.get("/session/{session_id}")
async def session_stats(session_id: str):
    return token_engine.session_stats(session_id)


@router.delete("/session/{session_id}")
async def reset_session(session_id: str):
    token_engine.reset_session(session_id)
    return {"reset": session_id}


@router.get("/cache")
async def cache_stats():
    return {"entries": token_engine.cache_stats()}


@router.delete("/cache")
async def invalidate_cache(prefix: Optional[str] = Query(None)):
    evicted = token_engine.invalidate_cache(prefix)
    return {"evicted": evicted}


@router.post("/cache/evict-expired")
async def evict_expired():
    evicted = token_engine.evict_expired()
    return {"evicted": evicted}


@router.get("/config")
async def get_config():
    return {
        "cache_ttl_seconds": CACHE_TTL,
        "session_warn_tokens": SESSION_WARN_TOKENS,
        "session_block_tokens": SESSION_BLOCK_TOKENS,
    }


# ── Historical DB stats ────────────────────────────────────────────────────────

@router.get("/history")
async def usage_history(
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate daily token usage for the last N days."""
    result = await db.execute(
        select(
            func.substr(TokenUsageLog.timestamp, 1, 10).label("date"),
            func.sum(TokenUsageLog.total_tokens).label("total_tokens"),
            func.sum(TokenUsageLog.prompt_tokens).label("prompt_tokens"),
            func.sum(TokenUsageLog.completion_tokens).label("completion_tokens"),
            func.sum(TokenUsageLog.tokens_saved).label("tokens_saved"),
            func.count(TokenUsageLog.id).label("calls"),
            func.sum(func.cast(TokenUsageLog.cache_hit, db.bind.dialect.integer_datatype if hasattr(db.bind, 'dialect') else text("INTEGER"))).label("cache_hits"),
        )
        .where(
            TokenUsageLog.timestamp >= func.date("now", f"-{days} days")
        )
        .group_by(func.substr(TokenUsageLog.timestamp, 1, 10))
        .order_by(func.substr(TokenUsageLog.timestamp, 1, 10).asc())
    )
    rows = result.mappings().all()
    return {"days": days, "rows": [dict(r) for r in rows]}


@router.get("/by-agent")
async def usage_by_agent(
    days: int = Query(30, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    """Total token usage grouped by agent type."""
    result = await db.execute(
        select(
            TokenUsageLog.agent_type,
            func.sum(TokenUsageLog.total_tokens).label("total_tokens"),
            func.sum(TokenUsageLog.tokens_saved).label("tokens_saved"),
            func.count(TokenUsageLog.id).label("calls"),
        )
        .where(TokenUsageLog.timestamp >= func.date("now", f"-{days} days"))
        .group_by(TokenUsageLog.agent_type)
        .order_by(func.sum(TokenUsageLog.total_tokens).desc())
    )
    rows = result.mappings().all()
    return {"days": days, "rows": [dict(r) for r in rows]}


@router.get("/by-model")
async def usage_by_model(
    days: int = Query(30, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    """Total token usage grouped by provider + model."""
    result = await db.execute(
        select(
            TokenUsageLog.provider,
            TokenUsageLog.model,
            func.sum(TokenUsageLog.total_tokens).label("total_tokens"),
            func.count(TokenUsageLog.id).label("calls"),
            func.sum(TokenUsageLog.tokens_saved).label("tokens_saved"),
        )
        .where(TokenUsageLog.timestamp >= func.date("now", f"-{days} days"))
        .group_by(TokenUsageLog.provider, TokenUsageLog.model)
        .order_by(func.sum(TokenUsageLog.total_tokens).desc())
    )
    rows = result.mappings().all()
    return {"days": days, "rows": [dict(r) for r in rows]}


@router.get("/recent")
async def recent_calls(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Most recent individual LLM calls."""
    result = await db.execute(
        select(TokenUsageLog)
        .order_by(TokenUsageLog.timestamp.desc())
        .limit(limit)
    )
    rows = result.scalars().all()
    return {"calls": [
        {
            "id": r.id,
            "session_id": r.session_id,
            "provider": r.provider,
            "model": r.model,
            "agent_type": r.agent_type,
            "prompt_tokens": r.prompt_tokens,
            "completion_tokens": r.completion_tokens,
            "total_tokens": r.total_tokens,
            "tokens_saved": r.tokens_saved,
            "cache_hit": r.cache_hit,
            "timestamp": r.timestamp,
        }
        for r in rows
    ]}


@router.get("/by-project")
async def usage_by_project(
    days: int = Query(30, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    """Per-project token usage breakdown (grouped by agent_type, as TokenUsageLog has no project_id)."""
    result = await db.execute(
        select(
            TokenUsageLog.agent_type,
            func.count(TokenUsageLog.id).label("calls"),
            func.sum(TokenUsageLog.total_tokens).label("total_tokens"),
            func.sum(TokenUsageLog.tokens_saved).label("tokens_saved"),
        )
        .where(TokenUsageLog.timestamp >= func.date("now", f"-{days} days"))
        .group_by(TokenUsageLog.agent_type)
        .order_by(func.sum(TokenUsageLog.total_tokens).desc())
    )
    rows = result.mappings().all()
    return {
        "rows": [
            {
                "project_id": None,
                "project_name": r["agent_type"] or "default",
                "calls": r["calls"],
                "total_tokens": r["total_tokens"] or 0,
                "tokens_saved": r["tokens_saved"] or 0,
            }
            for r in rows
        ]
    }


@router.get("/export-csv")
async def export_csv(db: AsyncSession = Depends(get_db)):
    """Export all token usage records as CSV."""
    result = await db.execute(
        select(TokenUsageLog).order_by(TokenUsageLog.timestamp.desc())
    )
    rows = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    headers = [
        "id", "session_id", "provider", "model", "agent_type",
        "prompt_tokens", "completion_tokens", "total_tokens",
        "tokens_saved", "cache_hit", "timestamp",
    ]
    writer.writerow(headers)
    for r in rows:
        writer.writerow([
            r.id, r.session_id, r.provider, r.model, r.agent_type,
            r.prompt_tokens, r.completion_tokens, r.total_tokens,
            r.tokens_saved, r.cache_hit, r.timestamp,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=token_usage.csv"},
    )


@router.get("/summary")
async def usage_summary(db: AsyncSession = Depends(get_db)):
    """Single-number summary combining in-memory and DB totals."""
    result = await db.execute(
        select(
            func.sum(TokenUsageLog.total_tokens),
            func.sum(TokenUsageLog.tokens_saved),
            func.count(TokenUsageLog.id),
        )
    )
    row = result.one()
    db_total       = row[0] or 0
    db_saved       = row[1] or 0
    db_calls       = row[2] or 0
    live           = token_engine.global_stats()
    total_with_saved = db_total + db_saved
    return {
        "lifetime_total_tokens": db_total,
        "lifetime_tokens_saved": db_saved,
        "lifetime_calls": db_calls,
        "lifetime_efficiency_pct": round(100 * db_saved / total_with_saved if total_with_saved else 0, 1),
        "live_session_tokens": live["total_tokens"],
        "live_cache_entries": live["cache_size"],
        "live_cache_hits": live["cache_hits"],
    }
