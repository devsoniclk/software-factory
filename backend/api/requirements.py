"""Requirements CRUD router with status transitions."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.engine import get_db
from backend.models.database import Requirement, Project, ReqStatus, uid, now_iso
from backend.models.schemas import RequirementCreate, RequirementResponse
from backend.services.audit_service import audit_service

router = APIRouter(prefix="/projects/{project_id}/requirements", tags=["requirements"])

VALID_TRANSITIONS = {
    "draft": ["review"],
    "review": ["approved", "draft"],
    "approved": ["implemented", "review"],
    "implemented": [],
}


@router.post("", response_model=RequirementResponse)
async def create_requirement(project_id: str, body: RequirementCreate, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    req = Requirement(
        id=uid(),
        project_id=project_id,
        title=body.title,
        description=body.description,
        priority=body.priority,
        acceptance_criteria_json=json.dumps(body.acceptance_criteria),
        ai_generated=body.ai_generated,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    await audit_service.log_create(db, "requirement", req.id, {"title": req.title, "project_id": project_id})
    return req


@router.get("", response_model=list[RequirementResponse])
async def list_requirements(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Requirement).where(Requirement.project_id == project_id).order_by(Requirement.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{req_id}", response_model=RequirementResponse)
async def get_requirement(project_id: str, req_id: str, db: AsyncSession = Depends(get_db)):
    req = await db.get(Requirement, req_id)
    if not req or req.project_id != project_id:
        raise HTTPException(status_code=404, detail="Requirement not found")
    return req


@router.patch("/{req_id}/status")
async def update_status(project_id: str, req_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    req = await db.get(Requirement, req_id)
    if not req or req.project_id != project_id:
        raise HTTPException(status_code=404, detail="Requirement not found")
    new_status = body.get("status", "")
    old_status = req.status.value if hasattr(req.status, "value") else req.status
    allowed = VALID_TRANSITIONS.get(old_status, [])
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail=f"Cannot transition from '{old_status}' to '{new_status}'. Allowed: {allowed}")
    req.status = ReqStatus(new_status)
    await db.commit()
    await db.refresh(req)
    await audit_service.log_status_change(db, "requirement", req_id, old_status, new_status)
    return {"id": req.id, "status": req.status.value}


@router.delete("/{req_id}")
async def delete_requirement(project_id: str, req_id: str, db: AsyncSession = Depends(get_db)):
    req = await db.get(Requirement, req_id)
    if not req or req.project_id != project_id:
        raise HTTPException(status_code=404, detail="Requirement not found")
    data = {"title": req.title}
    await db.delete(req)
    await db.commit()
    await audit_service.log_delete(db, "requirement", req_id, data)
    return {"deleted": req_id}
