"""Project lifecycle API — copy, archive, restore projects."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from backend.models.engine import get_db
from backend.models.database import Project, Requirement, Blueprint, WorkOrder, Feedback, uid, now_iso

router = APIRouter(prefix="/lifecycle", tags=["lifecycle"])

class CopyRequest(BaseModel):
    new_name: str
    include_requirements: bool = True
    include_blueprints: bool = True
    include_work_orders: bool = False

@router.post("/project/{project_id}/copy")
async def copy_project(project_id: str, body: CopyRequest, db: AsyncSession = Depends(get_db)):
    """Duplicate a project with all its documents into a new project."""
    src = await db.get(Project, project_id)
    if not src:
        raise HTTPException(404, "Source project not found")

    new_project = Project(
        id=uid(), name=body.new_name,
        description=f"Copy of: {src.description}",
        template=src.template,
        settings_json=src.settings_json,
        product_overview_json=src.product_overview_json,
    )
    db.add(new_project)
    await db.flush()  # get new_project.id

    req_id_map = {}
    bp_id_map = {}

    if body.include_requirements:
        reqs = (await db.execute(select(Requirement).where(Requirement.project_id == project_id))).scalars().all()
        for req in reqs:
            new_req = Requirement(
                id=uid(), project_id=new_project.id, req_id=req.req_id,
                title=req.title, description=req.description, priority=req.priority,
                status=req.status, acceptance_criteria_json=req.acceptance_criteria_json,
                ai_generated=req.ai_generated,
            )
            db.add(new_req)
            req_id_map[req.id] = new_req.id

    if body.include_blueprints:
        bps = (await db.execute(select(Blueprint).where(Blueprint.project_id == project_id))).scalars().all()
        for bp in bps:
            new_bp = Blueprint(
                id=uid(), project_id=new_project.id, bp_id=bp.bp_id,
                name=bp.name, description=bp.description,
                dsl_content=bp.dsl_content, decisions_json=bp.decisions_json,
                components_json=bp.components_json,
            )
            db.add(new_bp)
            bp_id_map[bp.id] = new_bp.id

    await db.commit()
    await db.refresh(new_project)
    return {
        "new_project_id": new_project.id,
        "new_project_name": new_project.name,
        "requirements_copied": len(req_id_map),
        "blueprints_copied": len(bp_id_map),
    }


@router.post("/project/{project_id}/archive")
async def archive_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """Archive a project (mark as archived in settings_json)."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    try:
        settings = json.loads(project.settings_json or "{}")
    except Exception:
        settings = {}
    settings["archived"] = True
    settings["archived_at"] = now_iso()
    project.settings_json = json.dumps(settings)
    await db.commit()
    return {"project_id": project_id, "archived": True, "archived_at": settings["archived_at"]}


@router.post("/project/{project_id}/restore")
async def restore_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """Restore an archived project."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    try:
        settings = json.loads(project.settings_json or "{}")
    except Exception:
        settings = {}
    settings.pop("archived", None)
    settings.pop("archived_at", None)
    project.settings_json = json.dumps(settings)
    await db.commit()
    return {"project_id": project_id, "archived": False}


@router.get("/project/{project_id}/status")
async def get_archive_status(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    try:
        settings = json.loads(project.settings_json or "{}")
    except Exception:
        settings = {}
    return {"project_id": project_id, "archived": settings.get("archived", False), "archived_at": settings.get("archived_at")}
