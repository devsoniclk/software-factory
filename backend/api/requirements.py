"""Requirements CRUD router with REQ-ID assignment, EARS validation, and version history."""
import json
import re
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.models.engine import get_db
from backend.models.database import Requirement, Project, ReqStatus, DocumentVersion, uid, now_iso, current_user
from backend.models.schemas import RequirementCreate, RequirementResponse
from backend.services.audit_service import audit_service
from backend.services.ears import validate_criteria
from backend.api.versions import snapshot
from backend.services.knowledge_graph import kg
from backend.services import doc_store

router = APIRouter(prefix="/projects/{project_id}/requirements", tags=["requirements"])

VALID_TRANSITIONS = {
    "draft": ["review"],
    "review": ["approved", "draft"],
    "approved": ["implemented", "review"],
    "implemented": [],
}


def _project_prefix(name: str) -> str:
    """Derive a 3-4 letter uppercase prefix from a project name."""
    letters = re.sub(r"[^a-zA-Z]", "", name).upper()
    return letters[:4] if letters else "PRJ"


async def _assign_req_id(db: AsyncSession, project: Project) -> str:
    project.req_counter = (project.req_counter or 0) + 1
    prefix = _project_prefix(project.name)
    return f"REQ-{prefix}-{project.req_counter:03d}"


@router.post("", response_model=RequirementResponse)
async def create_requirement(
    project_id: str,
    body: RequirementCreate,
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    req_id = await _assign_req_id(db, project)
    criteria = body.acceptance_criteria
    ears_warnings = validate_criteria(criteria)

    req = Requirement(
        id=uid(),
        project_id=project_id,
        req_id=req_id,
        title=body.title,
        description=body.description,
        priority=body.priority,
        acceptance_criteria_json=json.dumps(criteria),
        ears_warnings_json=json.dumps(ears_warnings),
        ai_generated=body.ai_generated,
        created_by=current_user(),
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    # Version snapshot v1
    await snapshot(
        db,
        entity_type="requirement",
        entity_id=req.id,
        content={"title": req.title, "description": req.description, "acceptance_criteria": criteria},
        version_number=1,
        summary="Initial version",
    )

    # Sync to knowledge graph
    await kg.sync_entity(
        db,
        entity_type="requirement",
        entity_id=req.id,
        project_id=project_id,
        title=f"{req_id}: {req.title}",
        content=req.description,
        metadata={"req_id": req_id, "priority": req.priority, "status": "draft"},
    )

    await audit_service.log_create(db, "requirement", req.id, {"req_id": req_id, "title": req.title})
    try:
        doc_store.save_requirement(project_id, req)
    except Exception:
        pass
    return req


@router.get("", response_model=list[RequirementResponse])
async def list_requirements(
    project_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Requirement)
        .where(Requirement.project_id == project_id)
        .order_by(Requirement.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/{req_id}", response_model=RequirementResponse)
async def get_requirement(project_id: str, req_id: str, db: AsyncSession = Depends(get_db)):
    req = await db.get(Requirement, req_id)
    if not req or req.project_id != project_id:
        raise HTTPException(status_code=404, detail="Requirement not found")
    return req


@router.put("/{req_id}", response_model=RequirementResponse)
async def update_requirement(
    project_id: str,
    req_id: str,
    body: RequirementCreate,
    db: AsyncSession = Depends(get_db),
):
    req = await db.get(Requirement, req_id)
    if not req or req.project_id != project_id:
        raise HTTPException(status_code=404, detail="Requirement not found")

    before = {
        "title": req.title,
        "description": req.description,
        "acceptance_criteria": json.loads(req.acceptance_criteria_json or "[]"),
    }
    criteria = body.acceptance_criteria
    ears_warnings = validate_criteria(criteria)

    req.title = body.title
    req.description = body.description
    req.priority = body.priority
    req.acceptance_criteria_json = json.dumps(criteria)
    req.ears_warnings_json = json.dumps(ears_warnings)

    # Count existing versions
    ver_result = await db.execute(
        select(func.count()).where(
            DocumentVersion.entity_type == "requirement",
            DocumentVersion.entity_id == req_id,
        )
    )
    next_version = (ver_result.scalar() or 0) + 1

    await db.commit()
    await db.refresh(req)

    await snapshot(
        db,
        entity_type="requirement",
        entity_id=req_id,
        content={"title": req.title, "description": req.description, "acceptance_criteria": criteria},
        version_number=next_version,
        summary="Updated",
    )

    await kg.sync_entity(
        db,
        entity_type="requirement",
        entity_id=req.id,
        project_id=project_id,
        title=f"{req.req_id}: {req.title}",
        content=req.description,
        metadata={"req_id": req.req_id, "priority": req.priority, "status": str(req.status)},
    )

    await audit_service.log_update(db, "requirement", req_id, before, {
        "title": req.title,
        "description": req.description,
    })
    try:
        doc_store.save_requirement(project_id, req)
    except Exception:
        pass
    return req


@router.patch("/{req_id}/status")
async def update_status(
    project_id: str,
    req_id: str,
    new_status: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    req = await db.get(Requirement, req_id)
    if not req or req.project_id != project_id:
        raise HTTPException(status_code=404, detail="Requirement not found")
    old_status = req.status.value if hasattr(req.status, "value") else req.status
    allowed = VALID_TRANSITIONS.get(old_status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail={
                "message": f"Cannot transition from '{old_status}' to '{new_status}'",
                "allowed": allowed,
                "current": old_status,
            },
        )
    req.status = ReqStatus(new_status)
    await db.commit()
    await db.refresh(req)
    await audit_service.log_status_change(db, "requirement", req_id, old_status, new_status)
    return {"id": req.id, "status": req.status.value}


@router.get("/{req_id}/ears-check")
async def check_ears(project_id: str, req_id: str, db: AsyncSession = Depends(get_db)):
    """Return EARS warnings for this requirement's acceptance criteria."""
    req = await db.get(Requirement, req_id)
    if not req or req.project_id != project_id:
        raise HTTPException(status_code=404, detail="Requirement not found")
    criteria = json.loads(req.acceptance_criteria_json or "[]")
    warnings = validate_criteria(criteria)
    return {
        "req_id": req.req_id,
        "total": len(criteria),
        "conforming": len(criteria) - len(warnings),
        "warnings": warnings,
    }


@router.delete("/{req_id}")
async def delete_requirement(project_id: str, req_id: str, db: AsyncSession = Depends(get_db)):
    req = await db.get(Requirement, req_id)
    if not req or req.project_id != project_id:
        raise HTTPException(status_code=404, detail="Requirement not found")
    data = {"title": req.title, "req_id": req.req_id}
    await db.delete(req)
    await db.commit()
    await audit_service.log_delete(db, "requirement", req_id, data)
    return {"deleted": req_id}
