"""Audit logs router."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.engine import get_db
from backend.models.database import AuditLog
from backend.models.schemas import AuditLogResponse

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[AuditLogResponse])
async def list_audit_logs(
    entity_type: str = Query(None, description="Filter by entity type"),
    entity_id: str = Query(None, description="Filter by entity id"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AuditLog).order_by(AuditLog.timestamp.desc())
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if entity_id:
        stmt = stmt.where(AuditLog.entity_id == entity_id)
    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    return result.scalars().all()
