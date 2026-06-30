"""Drift detection API — detect, list, and resolve blueprint/code drift alerts."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from backend.models.engine import get_db
from backend.models.database import DriftAlert, now_iso, uid
from backend.services.drift_service import detect_drift, run_project_drift

router = APIRouter(prefix="/drift", tags=["drift"])


def _alert_out(a: DriftAlert) -> dict:
    return {
        "id": a.id, "project_id": a.project_id, "blueprint_id": a.blueprint_id,
        "repo_id": a.repo_id, "alert_type": a.alert_type, "severity": a.severity,
        "title": a.title, "description": a.description,
        "blueprint_reference": a.blueprint_reference, "code_reality": a.code_reality,
        "status": a.status, "resolution_note": a.resolution_note,
        "detected_at": a.detected_at, "resolved_at": a.resolved_at,
    }


@router.get("/project/{project_id}")
async def list_drift_alerts(
    project_id: str,
    status: str = Query("open", pattern="^(open|acknowledged|resolved|all)$"),
    db: AsyncSession = Depends(get_db),
):
    q = select(DriftAlert).where(DriftAlert.project_id == project_id)
    if status != "all":
        q = q.where(DriftAlert.status == status)
    q = q.order_by(DriftAlert.detected_at.desc())
    result = await db.execute(q)
    return [_alert_out(a) for a in result.scalars().all()]


@router.post("/project/{project_id}/scan")
async def scan_project_drift(project_id: str, db: AsyncSession = Depends(get_db)):
    """Run full drift scan across all blueprints for a project."""
    return await run_project_drift(project_id, db)


@router.post("/project/{project_id}/blueprints/{blueprint_id}/scan")
async def scan_blueprint_drift(
    project_id: str, blueprint_id: str, repo_id: Optional[str] = Query(None), db: AsyncSession = Depends(get_db)
):
    return await detect_drift(project_id, blueprint_id, repo_id or "", db)


class ResolveBody(BaseModel):
    status: str = "resolved"   # "resolved" | "acknowledged"
    resolution_note: str = ""


@router.patch("/alerts/{alert_id}")
async def resolve_alert(alert_id: str, body: ResolveBody, db: AsyncSession = Depends(get_db)):
    alert = await db.get(DriftAlert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = body.status
    alert.resolution_note = body.resolution_note
    if body.status == "resolved":
        alert.resolved_at = now_iso()
    await db.commit()
    return _alert_out(alert)


@router.delete("/project/{project_id}/alerts")
async def clear_resolved_alerts(project_id: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import delete
    await db.execute(delete(DriftAlert).where(DriftAlert.project_id == project_id, DriftAlert.status == "resolved"))
    await db.commit()
    return {"cleared": True}


@router.post("/project/{project_id}/runtime-scan")
async def runtime_drift_scan(
    project_id: str,
    simulator_run_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Detect runtime drift by comparing simulator screens against blueprint components."""
    import re as _re
    from sqlalchemy import delete as _delete
    from backend.models.database import SimulatorRun, SimulatorScreen

    run = await db.get(SimulatorRun, simulator_run_id)
    if not run or run.project_id != project_id:
        raise HTTPException(status_code=404, detail="Simulator run not found")

    screen_result = await db.execute(
        select(SimulatorScreen).where(SimulatorScreen.run_id == simulator_run_id)
    )
    screens = screen_result.scalars().all()
    all_routes = {s.route.lower() for s in screens}
    all_titles = {(s.title or "").lower() for s in screens}

    from backend.models.database import Blueprint
    bp_result = await db.execute(select(Blueprint).where(Blueprint.project_id == project_id))
    blueprints = bp_result.scalars().all()

    await db.execute(
        _delete(DriftAlert).where(
            DriftAlert.project_id == project_id,
            DriftAlert.alert_type == "missing_screen",
        )
    )

    new_alerts = []
    for bp in blueprints:
        dsl = bp.dsl_content or ""
        component_names = _re.findall(r'^component\s+(\S+)', dsl, _re.MULTILINE)
        for comp in component_names:
            comp_lower = comp.lower()
            route_match = any(comp_lower in r or r in comp_lower for r in all_routes)
            title_match = any(comp_lower in t or t in comp_lower for t in all_titles if t)
            if not route_match and not title_match:
                alert = DriftAlert(
                    id=uid(), project_id=project_id, blueprint_id=bp.id,
                    alert_type="missing_screen", severity="warning",
                    title=f"No screen found for component `{comp}`",
                    description=f"Blueprint '{bp.name}' defines component `{comp}` but no simulator screen matches.",
                    blueprint_reference=f"component {comp} in {bp.name}",
                    code_reality=f"({len(screens)} screens crawled, none match)",
                )
                db.add(alert)
                new_alerts.append({"component": comp, "blueprint": bp.name})

    await db.commit()
    return {
        "project_id": project_id,
        "simulator_run_id": simulator_run_id,
        "screens_checked": len(screens),
        "blueprints_checked": len(blueprints),
        "new_alerts": len(new_alerts),
        "alerts": new_alerts,
    }
