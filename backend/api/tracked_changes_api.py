"""Tracked Changes API — agent-proposed edits shown inline for accept/reject."""
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from backend.models.engine import get_db
from backend.models.database import TrackedChange, Requirement, Blueprint, uid, now_iso

router = APIRouter(prefix="/tracked-changes", tags=["tracked_changes"])

class ChangeCreate(BaseModel):
    entity_type: str
    entity_id: str
    field: str
    before_text: str = ""
    after_text: str
    change_summary: str = ""
    agent_type: str = "ai"

def _change_out(c: TrackedChange) -> dict:
    return {"id": c.id, "entity_type": c.entity_type, "entity_id": c.entity_id,
            "field": c.field, "before_text": c.before_text, "after_text": c.after_text,
            "change_summary": c.change_summary, "agent_type": c.agent_type,
            "status": c.status, "created_at": c.created_at, "resolved_at": c.resolved_at}

@router.get("/entity/{entity_type}/{entity_id}")
async def get_changes(entity_type: str, entity_id: str, status: Optional[str] = Query(None), db: AsyncSession = Depends(get_db)):
    q = select(TrackedChange).where(TrackedChange.entity_type == entity_type, TrackedChange.entity_id == entity_id)
    if status:
        q = q.where(TrackedChange.status == status)
    result = await db.execute(q.order_by(TrackedChange.created_at.desc()))
    return [_change_out(c) for c in result.scalars().all()]

@router.post("")
async def propose_change(body: ChangeCreate, db: AsyncSession = Depends(get_db)):
    change = TrackedChange(id=uid(), entity_type=body.entity_type, entity_id=body.entity_id,
                           field=body.field, before_text=body.before_text, after_text=body.after_text,
                           change_summary=body.change_summary, agent_type=body.agent_type)
    db.add(change)
    await db.commit()
    return _change_out(change)

@router.patch("/{change_id}/accept")
async def accept_change(change_id: str, db: AsyncSession = Depends(get_db)):
    """Accept a tracked change and apply it to the entity."""
    change = await db.get(TrackedChange, change_id)
    if not change:
        raise HTTPException(404, "Change not found")
    change.status = "accepted"
    change.resolved_at = now_iso()

    # Apply the change to the entity
    if change.entity_type == "requirement":
        entity = await db.get(Requirement, change.entity_id)
        if entity and hasattr(entity, change.field):
            setattr(entity, change.field, change.after_text)
    elif change.entity_type == "blueprint":
        entity = await db.get(Blueprint, change.entity_id)
        if entity and change.field == "dsl_content":
            entity.dsl_content = change.after_text
        elif entity and hasattr(entity, change.field):
            setattr(entity, change.field, change.after_text)

    await db.commit()
    return _change_out(change)

@router.patch("/{change_id}/reject")
async def reject_change(change_id: str, db: AsyncSession = Depends(get_db)):
    change = await db.get(TrackedChange, change_id)
    if not change:
        raise HTTPException(404, "Change not found")
    change.status = "rejected"
    change.resolved_at = now_iso()
    await db.commit()
    return _change_out(change)

@router.delete("/{change_id}")
async def delete_change(change_id: str, db: AsyncSession = Depends(get_db)):
    change = await db.get(TrackedChange, change_id)
    if change:
        await db.delete(change)
        await db.commit()
    return {"deleted": change_id}
