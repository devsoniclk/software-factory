"""Projects CRUD router."""
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.engine import get_db
from backend.models.database import Project, Requirement, Blueprint, WorkOrder, uid, now_iso
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
    include_archived: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project).order_by(Project.created_at.desc()).offset(skip).limit(limit)
    )
    projects = result.scalars().all()
    if not include_archived:
        projects = [p for p in projects if not json.loads(p.settings_json or "{}").get("archived")]
    return projects


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


@router.get("/{project_id}/traceability")
async def get_traceability(project_id: str, db: AsyncSession = Depends(get_db)):
    """Return REQ → AC → Blueprint → WorkOrder traceability chains."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    reqs_result = await db.execute(
        select(Requirement).where(Requirement.project_id == project_id).order_by(Requirement.created_at)
    )
    reqs = reqs_result.scalars().all()

    bps_result = await db.execute(
        select(Blueprint).where(Blueprint.project_id == project_id)
    )
    blueprints = bps_result.scalars().all()

    # Build a map from blueprint id → work orders
    wo_map: dict[str, list] = {}
    for bp in blueprints:
        wo_result = await db.execute(
            select(WorkOrder).where(WorkOrder.blueprint_id == bp.id)
        )
        wo_map[bp.id] = [{"title": wo.title, "status": wo.status, "id": wo.id} for wo in wo_result.scalars().all()]

    chains = []
    gaps = []

    for req in reqs:
        try:
            criteria = json.loads(req.acceptance_criteria_json or "[]")
        except Exception:
            criteria = []
        try:
            ears_warnings = json.loads(req.ears_warnings_json or "[]")
        except Exception:
            ears_warnings = []

        # Find linked blueprints via description/title keyword match (simple heuristic)
        # In future, this should use the KG edges
        linked_bps = []
        for bp in blueprints:
            if req.req_id and bp.description and req.req_id in (bp.description or ""):
                linked_bps.append(bp)
            elif req.title and bp.name and req.title.lower() in (bp.name.lower() or ""):
                linked_bps.append(bp)

        linked_wos = []
        for bp in linked_bps:
            linked_wos.extend(wo_map.get(bp.id, []))

        chain = {
            "req_id": req.req_id,
            "req_title": req.title,
            "ears_warnings": len(ears_warnings),
            "criteria": [{"text": c} if isinstance(c, str) else c for c in criteria],
            "blueprints": [{"bp_id": bp.bp_id, "name": bp.name} for bp in linked_bps],
            "work_orders": linked_wos,
        }
        chains.append(chain)

        if not criteria:
            gaps.append({"type": "no_ac", "message": f"{req.req_id}: No acceptance criteria defined"})
        if not linked_bps:
            gaps.append({"type": "no_blueprint", "message": f"{req.req_id}: Not linked to any blueprint"})

    return {"chains": chains, "gaps": gaps}


@router.get("/{project_id}/gaps")
async def get_gaps(project_id: str, db: AsyncSession = Depends(get_db)):
    """Return traceability gaps: missing AC, non-EARS AC, orphaned blueprints."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    reqs_result = await db.execute(
        select(Requirement).where(Requirement.project_id == project_id)
    )
    reqs = reqs_result.scalars().all()

    bps_result = await db.execute(
        select(Blueprint).where(Blueprint.project_id == project_id)
    )
    blueprints = bps_result.scalars().all()

    gaps = []

    for req in reqs:
        try:
            criteria = json.loads(req.acceptance_criteria_json or "[]")
        except Exception:
            criteria = []
        try:
            warnings = json.loads(req.ears_warnings_json or "[]")
        except Exception:
            warnings = []

        if not criteria:
            gaps.append({"severity": "high", "type": "no_ac", "entity": req.req_id, "message": f"No acceptance criteria"})
        elif warnings:
            gaps.append({"severity": "medium", "type": "ears_nonconforming", "entity": req.req_id, "message": f"{len(warnings)} AC not EARS-compliant"})

    for bp in blueprints:
        wo_result = await db.execute(
            select(WorkOrder).where(WorkOrder.blueprint_id == bp.id)
        )
        wos = wo_result.scalars().all()
        if not wos:
            gaps.append({"severity": "low", "type": "no_work_orders", "entity": bp.bp_id, "message": f"Blueprint has no work orders"})

    return {"gaps": gaps, "total": len(gaps)}
