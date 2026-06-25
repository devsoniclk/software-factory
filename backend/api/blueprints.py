"""Blueprints CRUD router with BLU-IDs, DSL parsing, KG sync, and version history."""
import json
import re
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.models.engine import get_db
from backend.models.database import Blueprint, Project, DocumentVersion, uid, now_iso
from backend.models.schemas import BlueprintCreate, BlueprintResponse
from backend.services.audit_service import audit_service
from backend.services.blueprint_parser import parse_dsl, sync_to_kg
from backend.api.versions import snapshot

router = APIRouter(prefix="/projects/{project_id}/blueprints", tags=["blueprints"])


def _project_prefix(name: str) -> str:
    letters = re.sub(r"[^a-zA-Z]", "", name).upper()
    return letters[:4] if letters else "PRJ"


async def _assign_bp_id(db: AsyncSession, project: Project) -> str:
    project.bp_counter = (project.bp_counter or 0) + 1
    prefix = _project_prefix(project.name)
    return f"BLU-{prefix}-{project.bp_counter:03d}"


async def _parse_and_sync(bp: Blueprint, db: AsyncSession) -> None:
    """Parse DSL content and sync nodes/edges to the KG (fire-and-forget safe)."""
    if not bp.dsl_content or not bp.dsl_content.strip():
        return
    try:
        parsed = parse_dsl(bp.dsl_content, bp.project_id, bp.id)
        bp.parsed_nodes_json = json.dumps(parsed["nodes"])
        await db.commit()
        await sync_to_kg(parsed, bp.project_id, db)
    except Exception:
        pass  # Parser errors must never block the save


@router.post("", response_model=BlueprintResponse)
async def create_blueprint(
    project_id: str,
    body: BlueprintCreate,
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    bp_id = await _assign_bp_id(db, project)
    bp = Blueprint(
        id=uid(),
        project_id=project_id,
        bp_id=bp_id,
        name=body.name,
        description=body.description,
        dsl_content=body.dsl_content,
        decisions_json=json.dumps(body.decisions),
        components_json=json.dumps(body.components),
        constraints_json=json.dumps(body.constraints),
        version=1,
    )
    db.add(bp)
    await db.commit()
    await db.refresh(bp)

    # Parse DSL and sync KG
    await _parse_and_sync(bp, db)

    # Version snapshot
    await snapshot(
        db,
        entity_type="blueprint",
        entity_id=bp.id,
        content={"name": bp.name, "description": bp.description, "dsl_content": bp.dsl_content},
        version_number=1,
        summary="Initial version",
    )

    await audit_service.log_create(db, "blueprint", bp.id, {"bp_id": bp_id, "name": bp.name})
    return bp


@router.get("", response_model=list[BlueprintResponse])
async def list_blueprints(
    project_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Blueprint)
        .where(Blueprint.project_id == project_id)
        .order_by(Blueprint.version.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/{bp_id}", response_model=BlueprintResponse)
async def get_blueprint(project_id: str, bp_id: str, db: AsyncSession = Depends(get_db)):
    bp = await db.get(Blueprint, bp_id)
    if not bp or bp.project_id != project_id:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    return bp


@router.put("/{bp_id}", response_model=BlueprintResponse)
async def update_blueprint(
    project_id: str,
    bp_id: str,
    body: BlueprintCreate,
    db: AsyncSession = Depends(get_db),
):
    bp = await db.get(Blueprint, bp_id)
    if not bp or bp.project_id != project_id:
        raise HTTPException(status_code=404, detail="Blueprint not found")

    before = {"name": bp.name, "version": bp.version, "dsl_content": bp.dsl_content}

    bp.name = body.name
    bp.description = body.description
    bp.dsl_content = body.dsl_content
    bp.decisions_json = json.dumps(body.decisions)
    bp.components_json = json.dumps(body.components)
    bp.constraints_json = json.dumps(body.constraints)
    bp.version += 1

    await db.commit()
    await db.refresh(bp)

    # Parse updated DSL
    await _parse_and_sync(bp, db)

    # Version snapshot
    ver_result = await db.execute(
        select(func.count()).where(
            DocumentVersion.entity_type == "blueprint",
            DocumentVersion.entity_id == bp_id,
        )
    )
    next_version = (ver_result.scalar() or 0) + 1
    await snapshot(
        db,
        entity_type="blueprint",
        entity_id=bp_id,
        content={"name": bp.name, "description": bp.description, "dsl_content": bp.dsl_content},
        version_number=next_version,
        summary=f"Version {bp.version}",
    )

    await audit_service.log_update(db, "blueprint", bp.id, before, {
        "name": bp.name,
        "version": bp.version,
    })
    return bp


@router.get("/{bp_id}/parsed")
async def get_parsed_nodes(project_id: str, bp_id: str, db: AsyncSession = Depends(get_db)):
    """Return parsed DSL nodes for a blueprint."""
    bp = await db.get(Blueprint, bp_id)
    if not bp or bp.project_id != project_id:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    if not bp.dsl_content:
        return {"nodes": [], "edges": [], "unresolved": []}
    parsed = parse_dsl(bp.dsl_content, bp.project_id, bp.id)
    return parsed


@router.delete("/{bp_id}")
async def delete_blueprint(project_id: str, bp_id: str, db: AsyncSession = Depends(get_db)):
    bp = await db.get(Blueprint, bp_id)
    if not bp or bp.project_id != project_id:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    data = {"name": bp.name, "bp_id": bp.bp_id}
    await db.delete(bp)
    await db.commit()
    await audit_service.log_delete(db, "blueprint", bp_id, data)
    return {"deleted": bp_id}
