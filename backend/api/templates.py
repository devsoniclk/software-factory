"""Templates API — list project templates and apply them to create a project."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.engine import get_db
from backend.models.database import Project, Requirement, Blueprint, WorkOrder, uid, now_iso
from backend.config.settings import settings
from backend.seeds.templates import TEMPLATES

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("")
async def list_templates():
    """Return available project templates."""
    return [
        {
            "id": t["name"].lower().replace(" ", "_"),
            "name": t["name"],
            "description": t["description"],
            "category": t.get("category", "general"),
            "req_count": len(t.get("requirements", [])),
            "has_blueprint": bool(t.get("blueprint")),
        }
        for t in TEMPLATES
    ]


@router.get("/{template_id}")
async def get_template(template_id: str):
    """Return full detail of a template including requirements and blueprint."""
    tmpl = next(
        (t for t in TEMPLATES if t["name"].lower().replace(" ", "_") == template_id),
        None,
    )
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return tmpl


@router.post("/{template_id}/apply")
async def apply_template(template_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    """
    Create a new project pre-populated with the template's requirements and blueprint.
    Body: { "project_name": str, "project_description": str }
    """
    tmpl = next(
        (t for t in TEMPLATES if t["name"].lower().replace(" ", "_") == template_id),
        None,
    )
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")

    name = body.get("project_name", tmpl["name"])
    description = body.get("project_description", tmpl["description"])

    # Create project
    project = Project(
        id=uid(),
        name=name,
        description=description,
        template=template_id,
    )
    db.add(project)
    await db.flush()

    # Derive prefix
    import re
    letters = re.sub(r"[^a-zA-Z]", "", name).upper()
    prefix = letters[:4] if letters else "PRJ"

    # Create requirements
    created_reqs = []
    for i, req_data in enumerate(tmpl.get("requirements", []), start=1):
        req_id = f"REQ-{prefix}-{i:03d}"
        ac = req_data.get("acceptance_criteria", [])
        req = Requirement(
            id=uid(),
            project_id=project.id,
            req_id=req_id,
            title=req_data["title"],
            description=req_data.get("description", ""),
            priority=req_data.get("priority", 3),
            acceptance_criteria_json=json.dumps(ac),
            ears_warnings_json="[]",
        )
        db.add(req)
        created_reqs.append(req)

    project.req_counter = len(created_reqs)

    # Create blueprint if present
    created_bp = None
    if tmpl.get("blueprint"):
        bp_data = tmpl["blueprint"]
        bp_id = f"BLU-{prefix}-001"
        bp = Blueprint(
            id=uid(),
            project_id=project.id,
            bp_id=bp_id,
            name=bp_data["name"],
            description=bp_data.get("description", ""),
            decisions_json=json.dumps(bp_data.get("decisions", [])),
            components_json=json.dumps(bp_data.get("components", [])),
            constraints_json=json.dumps(bp_data.get("constraints", [])),
            version=1,
        )
        db.add(bp)
        project.bp_counter = 1
        created_bp = bp

    await db.commit()

    return {
        "project_id": project.id,
        "project_name": project.name,
        "requirements_created": len(created_reqs),
        "blueprint_created": created_bp is not None,
        "template_applied": template_id,
    }
