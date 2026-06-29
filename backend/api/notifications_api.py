"""Notifications API — notification center for hook results, flags, feedback."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from backend.models.engine import get_db
from backend.models.database import Notification, uid, now_iso

router = APIRouter(prefix="/notifications", tags=["notifications"])

def _notif_out(n: Notification) -> dict:
    return {"id": n.id, "project_id": n.project_id, "title": n.title, "body": n.body,
            "notification_type": n.notification_type, "entity_type": n.entity_type,
            "entity_id": n.entity_id, "read": n.read, "created_at": n.created_at}

@router.get("")
async def list_notifications(
    project_id: Optional[str] = Query(None),
    unread_only: bool = Query(False),
    limit: int = Query(50),
    db: AsyncSession = Depends(get_db),
):
    q = select(Notification).order_by(Notification.created_at.desc()).limit(limit)
    if project_id:
        q = q.where((Notification.project_id == project_id) | (Notification.project_id == None))
    if unread_only:
        q = q.where(Notification.read == False)
    result = await db.execute(q)
    return [_notif_out(n) for n in result.scalars().all()]

@router.get("/unread-count")
async def unread_count(project_id: Optional[str] = Query(None), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import func, select as sa_select
    q = sa_select(func.count()).select_from(Notification).where(Notification.read == False)
    if project_id:
        q = q.where((Notification.project_id == project_id) | (Notification.project_id == None))
    result = await db.execute(q)
    return {"count": result.scalar() or 0}

@router.patch("/{notif_id}/read")
async def mark_read(notif_id: str, db: AsyncSession = Depends(get_db)):
    n = await db.get(Notification, notif_id)
    if n:
        n.read = True
        await db.commit()
    return {"id": notif_id, "read": True}

@router.post("/mark-all-read")
async def mark_all_read(project_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = update(Notification).where(Notification.read == False).values(read=True)
    if project_id:
        q = q.where((Notification.project_id == project_id) | (Notification.project_id == None))
    await db.execute(q)
    await db.commit()
    return {"marked_read": True}

@router.delete("/{notif_id}")
async def delete_notification(notif_id: str, db: AsyncSession = Depends(get_db)):
    n = await db.get(Notification, notif_id)
    if n:
        await db.delete(n)
        await db.commit()
    return {"deleted": notif_id}
