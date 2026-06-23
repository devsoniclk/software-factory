"""Feedback CRUD router."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.engine import get_db
from backend.models.database import Feedback, Project, uid, now_iso
from backend.models.schemas import FeedbackCreate, FeedbackResponse
from backend.services.audit_service import audit_service

router = APIRouter(prefix="/projects/{project_id}/feedbacks", tags=["feedback"])


@router.post("", response_model=FeedbackResponse)
async def create_feedback(project_id: str, body: FeedbackCreate, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    fb = Feedback(
        id=uid(),
        project_id=project_id,
        source=body.source,
        raw_text=body.raw_text,
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)
    await audit_service.log_create(db, "feedback", fb.id, {"project_id": project_id, "source": fb.source})
    return fb


@router.get("", response_model=list[FeedbackResponse])
async def list_feedbacks(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Feedback).where(Feedback.project_id == project_id).order_by(Feedback.created_at.desc())
    )
    return result.scalars().all()


@router.patch("/{fb_id}/link")
async def link_feedback(project_id: str, fb_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    fb = await db.get(Feedback, fb_id)
    if not fb or fb.project_id != project_id:
        raise HTTPException(status_code=404, detail="Feedback not found")
    before = {"linked_work_order_id": fb.linked_work_order_id, "status": fb.status}
    fb.linked_work_order_id = body.get("work_order_id")
    fb.status = body.get("status", "linked")
    await db.commit()
    await db.refresh(fb)
    await audit_service.log_update(db, "feedback", fb.id, before, {"linked_work_order_id": fb.linked_work_order_id, "status": fb.status})
    return {"id": fb.id, "linked_work_order_id": fb.linked_work_order_id, "status": fb.status}
