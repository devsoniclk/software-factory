"""Comments & Flags API — inline comment threads and document flags."""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from backend.models.engine import get_db
from backend.models.database import CommentThread, Comment, DocumentFlag, Notification, uid, now_iso

router = APIRouter(prefix="/comments", tags=["comments"])

class ThreadCreate(BaseModel):
    entity_type: str
    entity_id: str
    field: str = ""
    anchor_text: str = ""
    first_comment: str

class CommentCreate(BaseModel):
    body: str
    author: str = "user"

class FlagCreate(BaseModel):
    entity_type: str
    entity_id: str
    reason: str = ""
    flag_type: str = "review"

def _thread_out(t: CommentThread, comments: Optional[List] = None) -> dict:
    return {
        "id": t.id, "entity_type": t.entity_type, "entity_id": t.entity_id,
        "field": t.field, "anchor_text": t.anchor_text, "status": t.status,
        "created_by": t.created_by, "created_at": t.created_at, "resolved_at": t.resolved_at,
        "comment_count": len(comments) if comments is not None else 0,
        "comments": [{"id": c.id, "body": c.body, "author": c.author, "created_at": c.created_at} for c in (comments or [])],
    }

@router.get("/entity/{entity_type}/{entity_id}")
async def get_threads(entity_type: str, entity_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CommentThread).where(CommentThread.entity_type == entity_type, CommentThread.entity_id == entity_id)
        .order_by(CommentThread.created_at.asc())
    )
    threads = result.scalars().all()
    out = []
    for thread in threads:
        cresult = await db.execute(select(Comment).where(Comment.thread_id == thread.id).order_by(Comment.created_at))
        comments = cresult.scalars().all()
        out.append(_thread_out(thread, comments))
    return out

@router.post("/threads")
async def create_thread(body: ThreadCreate, db: AsyncSession = Depends(get_db)):
    thread = CommentThread(id=uid(), entity_type=body.entity_type, entity_id=body.entity_id,
                           field=body.field, anchor_text=body.anchor_text)
    db.add(thread)
    await db.flush()
    comment = Comment(id=uid(), thread_id=thread.id, body=body.first_comment)
    db.add(comment)
    await db.commit()
    return _thread_out(thread, [comment])

@router.post("/threads/{thread_id}/reply")
async def add_reply(thread_id: str, body: CommentCreate, db: AsyncSession = Depends(get_db)):
    thread = await db.get(CommentThread, thread_id)
    if not thread:
        raise HTTPException(404, "Thread not found")
    comment = Comment(id=uid(), thread_id=thread_id, body=body.body, author=body.author)
    db.add(comment)
    await db.commit()
    return {"id": comment.id, "body": comment.body, "author": comment.author, "created_at": comment.created_at}

@router.patch("/threads/{thread_id}/resolve")
async def resolve_thread(thread_id: str, db: AsyncSession = Depends(get_db)):
    thread = await db.get(CommentThread, thread_id)
    if not thread:
        raise HTTPException(404, "Thread not found")
    thread.status = "resolved"
    thread.resolved_at = now_iso()
    await db.commit()
    return {"id": thread.id, "status": "resolved"}

@router.delete("/threads/{thread_id}")
async def delete_thread(thread_id: str, db: AsyncSession = Depends(get_db)):
    thread = await db.get(CommentThread, thread_id)
    if thread:
        await db.delete(thread)
        await db.commit()
    return {"deleted": thread_id}

# ── Flags ─────────────────────────────────────────────────────────────────────

flag_router = APIRouter(prefix="/flags", tags=["flags"])

def _flag_out(f: DocumentFlag) -> dict:
    return {"id": f.id, "entity_type": f.entity_type, "entity_id": f.entity_id,
            "reason": f.reason, "flag_type": f.flag_type, "status": f.status,
            "raised_by": f.raised_by, "created_at": f.created_at, "resolved_at": f.resolved_at}

@flag_router.get("/entity/{entity_type}/{entity_id}")
async def get_flags(entity_type: str, entity_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DocumentFlag).where(DocumentFlag.entity_type == entity_type, DocumentFlag.entity_id == entity_id)
    )
    return [_flag_out(f) for f in result.scalars().all()]

@flag_router.get("/counts")
async def flag_counts(entity_type: str = Query(...), entity_ids: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Return open flag count per entity_id. entity_ids is comma-separated."""
    ids = [x.strip() for x in entity_ids.split(",") if x.strip()]
    result = await db.execute(
        select(DocumentFlag.entity_id, func.count(DocumentFlag.id))
        .where(DocumentFlag.entity_type == entity_type, DocumentFlag.entity_id.in_(ids), DocumentFlag.status == "open")
        .group_by(DocumentFlag.entity_id)
    )
    return {row[0]: row[1] for row in result.all()}

@flag_router.post("")
async def raise_flag(body: FlagCreate, db: AsyncSession = Depends(get_db)):
    flag = DocumentFlag(id=uid(), entity_type=body.entity_type, entity_id=body.entity_id,
                        reason=body.reason, flag_type=body.flag_type)
    db.add(flag)
    # Create notification
    notif = Notification(id=uid(), title=f"Flag raised on {body.entity_type}",
                         body=body.reason or f"Flag type: {body.flag_type}",
                         notification_type="flag", entity_type=body.entity_type, entity_id=body.entity_id)
    db.add(notif)
    await db.commit()
    return _flag_out(flag)

@flag_router.patch("/{flag_id}/resolve")
async def resolve_flag(flag_id: str, db: AsyncSession = Depends(get_db)):
    flag = await db.get(DocumentFlag, flag_id)
    if not flag:
        raise HTTPException(404, "Flag not found")
    flag.status = "resolved"
    flag.resolved_at = now_iso()
    await db.commit()
    return _flag_out(flag)

@flag_router.delete("/{flag_id}")
async def delete_flag(flag_id: str, db: AsyncSession = Depends(get_db)):
    flag = await db.get(DocumentFlag, flag_id)
    if flag:
        await db.delete(flag)
        await db.commit()
    return {"deleted": flag_id}
