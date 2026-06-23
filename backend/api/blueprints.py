"""Blueprints CRUD router with versioning."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.engine import get_db
from backend.models.database import Blueprint, Project, uid, now_iso
from backend.models.schemas import BlueprintCreate, BlueprintResponse
from backend.services.audit_service import audit_service

router = APIRouter(prefix="/projects/{project_id}/blueprints", tags=["blueprints"])


@router.post("", response_model=BlueprintResponse)
async def create_blueprint(project_id: str, body: BlueprintCreate, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    bp = Blueprint(
        id=uid(),
        project_id=project_id,
        name=body.name,
        description=body.description,
        decisions_json=json.dumps(body.decisions),
        components_json=json.dumps(body.components),
        constraints_json=json.dumps(body.constraints),
        version=1,
    )
    db.add(bp)
    await db.commit()
    await db.refresh(bp)
    await audit_service.log_create(db, "blueprint", bp.id, {"name": bp.name, "project_id": project_id})
    return bp


@router.get("", response_model=list[BlueprintResponse])
async def list_blueprints(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Blueprint).where(Blueprint.project_id == project_id).order_by(Blueprint.version.desc())
    )
    return result.scalars().all()


@router.get("/{bp_id}", response_model=BlueprintResponse)
async def get_blueprint(project_id: str, bp_id: str, db: AsyncSession = Depends(get_db)):
    bp = await db.get(Blueprint, bp_id)
    if not bp or bp.project_id != project_id:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    return bp


@router.put("/{bp_id}", response_model=BlueprintResponse)
async def update_blueprint(project_id: str, bp_id: str, body: BlueprintCreate, db: AsyncSession = Depends(get_db)):
    bp = await db.get(Blueprint, bp_id)
    if not bp or bp.project_id != project_id:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    before = {"name": bp.name, "version": bp.version}
    bp.name = body.name
    bp.description = body.description
    bp.decisions_json = json.dumps(body.decisions)
    bp.components_json = json.dumps(body.components)
    bp.constraints_json = json.dumps(body.constraints)
    bp.version += 1
    await db.commit()
    await db.refresh(bp)
    await audit_service.log_update(db, "blueprint", bp.id, before, {"name": bp.name, "version": bp.version})
    return bp
