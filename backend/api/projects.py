"""Projects CRUD router."""
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.engine import get_db
from backend.models.database import Project, uid, now_iso
from backend.models.schemas import ProjectCreate, ProjectUpdate, ProjectResponse, ProductOverviewUpdate, GenerateProductOverviewRequest
from backend.services.audit_service import audit_service

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse)
async def create_project(body: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = Project(
        id=uid(),
        name=body.name,
        description=body.description,
        template=body.template,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    await audit_service.log_create(db, "project", project.id, {"name": project.name, "description": project.description})
    return project


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project).order_by(Project.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, body: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    before = {"name": project.name, "description": project.description}
    if body.name is not None:
        project.name = body.name
    if body.description is not None:
        project.description = body.description
    project.updated_at = now_iso()
    await db.commit()
    await db.refresh(project)
    await audit_service.log_update(db, "project", project.id, before, {"name": project.name, "description": project.description})
    return project


@router.delete("/{project_id}")
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    data = {"name": project.name, "description": project.description}
    await db.delete(project)
    await db.commit()
    await audit_service.log_delete(db, "project", project_id, data)
    return {"deleted": project_id}


@router.get("/{project_id}/overview")
async def get_product_overview(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return json.loads(project.product_overview_json or "{}")


@router.put("/{project_id}/overview")
async def update_product_overview(
    project_id: str,
    body: ProductOverviewUpdate,
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.product_overview_json = json.dumps(body.dict())
    project.updated_at = now_iso()
    await db.commit()
    return body.dict()


@router.post("/{project_id}/overview/generate")
async def generate_product_overview(
    project_id: str,
    body: GenerateProductOverviewRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a Product Overview document from interview answers using AI."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    from backend.agents.product_overview_agent import generate_product_overview as _gen
    overview = await _gen(body.interview_answers)

    project.product_overview_json = json.dumps(overview)
    project.updated_at = now_iso()
    await db.commit()
    await audit_service.log_update(db, "project", project_id, {}, {"product_overview": "generated"})
    return overview
