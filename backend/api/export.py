"""Export router — markdown and PDF export."""
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.engine import get_db
from backend.models.database import Project, Requirement, Blueprint, WorkOrder

router = APIRouter(prefix="/export", tags=["export"])


def _build_markdown(project, requirements, blueprints, work_orders_map) -> str:
    lines = [f"# {project.name}", "", f"**Description:** {project.description}", ""]
    lines.append(f"_Created: {project.created_at}_")
    lines.append(f"_Template: {project.template or 'None'}_")
    lines.append("")

    if requirements:
        lines.append("---")
        lines.append("## Requirements")
        lines.append("")
        for i, req in enumerate(requirements, 1):
            status = req.status.value if hasattr(req.status, "value") else req.status
            lines.append(f"### {i}. {req.title}")
            lines.append(f"- **Status:** {status} | **Priority:** {req.priority}")
            lines.append(f"- **Description:** {req.description}")
            try:
                criteria = json.loads(req.acceptance_criteria_json or "[]")
                if criteria:
                    lines.append("- **Acceptance Criteria:**")
                    for c in criteria:
                        lines.append(f"  - {c}")
            except json.JSONDecodeError:
                pass
            lines.append("")

    if blueprints:
        lines.append("---")
        lines.append("## Blueprints")
        lines.append("")
        for bp in blueprints:
            lines.append(f"### {bp.name} (v{bp.version})")
            lines.append(f"{bp.description}")
            lines.append("")
            try:
                decisions = json.loads(bp.decisions_json or "[]")
                if decisions:
                    lines.append("**Decisions:**")
                    for d in decisions:
                        if isinstance(d, dict):
                            lines.append(f"- {d.get('title', d)}")
                        else:
                            lines.append(f"- {d}")
                    lines.append("")
            except json.JSONDecodeError:
                pass
            try:
                components = json.loads(bp.components_json or "[]")
                if components:
                    lines.append("**Components:**")
                    for c in components:
                        if isinstance(c, dict):
                            lines.append(f"- {c.get('name', c)}")
                        else:
                            lines.append(f"- {c}")
                    lines.append("")
            except json.JSONDecodeError:
                pass
            try:
                constraints = json.loads(bp.constraints_json or "[]")
                if constraints:
                    lines.append("**Constraints:**")
                    for c in constraints:
                        lines.append(f"- {c}")
                    lines.append("")
            except json.JSONDecodeError:
                pass
            wos = work_orders_map.get(bp.id, [])
            if wos:
                lines.append("**Work Orders:**")
                for wo in wos:
                    status = wo.status.value if hasattr(wo.status, "value") else wo.status
                    lines.append(f"- [{status}] {wo.title}: {wo.description[:200]}")
                lines.append("")

    lines.append("---")
    lines.append(f"_Exported from 1024 Studio_")
    return "\n".join(lines)


@router.get("/project/{project_id}/markdown")
async def export_markdown(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    req_result = await db.execute(
        select(Requirement).where(Requirement.project_id == project_id).order_by(Requirement.priority)
    )
    requirements = req_result.scalars().all()

    bp_result = await db.execute(
        select(Blueprint).where(Blueprint.project_id == project_id).order_by(Blueprint.version.desc())
    )
    blueprints = bp_result.scalars().all()

    work_orders_map = {}
    for bp in blueprints:
        wo_result = await db.execute(
            select(WorkOrder).where(WorkOrder.blueprint_id == bp.id).order_by(WorkOrder.created_at)
        )
        work_orders_map[bp.id] = wo_result.scalars().all()

    md = _build_markdown(project, requirements, blueprints, work_orders_map)
    return PlainTextResponse(content=md, media_type="text/markdown")


@router.get("/project/{project_id}/pdf")
async def export_pdf(project_id: str, db: AsyncSession = Depends(get_db)):
    """PDF export — returns markdown for now (PDF generation requires additional deps)."""
    # Reuse markdown export logic
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    req_result = await db.execute(
        select(Requirement).where(Requirement.project_id == project_id).order_by(Requirement.priority)
    )
    requirements = req_result.scalars().all()

    bp_result = await db.execute(
        select(Blueprint).where(Blueprint.project_id == project_id).order_by(Blueprint.version.desc())
    )
    blueprints = bp_result.scalars().all()

    work_orders_map = {}
    for bp in blueprints:
        wo_result = await db.execute(
            select(WorkOrder).where(WorkOrder.blueprint_id == bp.id).order_by(WorkOrder.created_at)
        )
        work_orders_map[bp.id] = wo_result.scalars().all()

    md = _build_markdown(project, requirements, blueprints, work_orders_map)
    return PlainTextResponse(content=md, media_type="text/markdown")
