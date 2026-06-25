"""Analytics / reporting API — project health metrics and burndown data."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.models.engine import get_db
from backend.models.database import (
    Project, Requirement, Blueprint, WorkOrder, TestCase, AuditLog
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/project/{project_id}")
async def project_analytics(project_id: str, db: AsyncSession = Depends(get_db)):
    """Comprehensive project health metrics."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Requirements by status
    req_result = await db.execute(
        select(Requirement).where(Requirement.project_id == project_id)
    )
    reqs = req_result.scalars().all()

    req_by_status = {}
    req_by_priority = {}
    ai_gen_count = 0
    total_ac = 0
    for r in reqs:
        s = r.status.value if hasattr(r.status, "value") else str(r.status)
        req_by_status[s] = req_by_status.get(s, 0) + 1
        p = str(r.priority)
        req_by_priority[p] = req_by_priority.get(p, 0) + 1
        if r.ai_generated:
            ai_gen_count += 1
        try:
            ac = json.loads(r.acceptance_criteria_json or "[]")
            total_ac += len(ac)
        except Exception:
            pass

    # Blueprints
    bp_result = await db.execute(
        select(Blueprint).where(Blueprint.project_id == project_id)
    )
    blueprints = bp_result.scalars().all()

    # Work orders
    wo_by_status = {}
    wo_by_blueprint = {}
    for bp in blueprints:
        wo_result = await db.execute(
            select(WorkOrder).where(WorkOrder.blueprint_id == bp.id)
        )
        wos = wo_result.scalars().all()
        wo_by_blueprint[bp.name] = len(wos)
        for wo in wos:
            s = wo.status.value if hasattr(wo.status, "value") else str(wo.status)
            wo_by_status[s] = wo_by_status.get(s, 0) + 1

    total_wos = sum(wo_by_status.values())
    completed_wos = wo_by_status.get("completed", 0)
    completion_pct = round((completed_wos / total_wos * 100) if total_wos else 0, 1)

    # Tests
    test_result = await db.execute(
        select(TestCase).join(Requirement, TestCase.requirement_id == Requirement.id)
        .where(Requirement.project_id == project_id)
    )
    tests = test_result.scalars().all()
    test_by_status = {}
    for t in tests:
        s = t.status.value if hasattr(t.status, "value") else str(t.status)
        test_by_status[s] = test_by_status.get(s, 0) + 1

    total_tests = len(tests)
    passed_tests = test_by_status.get("passed", 0)
    pass_rate = round((passed_tests / total_tests * 100) if total_tests else 0, 1)

    # Audit log activity (last 30 entries)
    audit_result = await db.execute(
        select(AuditLog)
        .where(AuditLog.entity_id.in_([r.id for r in reqs] + [bp.id for bp in blueprints]))
        .order_by(AuditLog.timestamp.desc())
        .limit(30)
    )
    audit_logs = audit_result.scalars().all()
    activity_by_action = {}
    for log in audit_logs:
        activity_by_action[log.action] = activity_by_action.get(log.action, 0) + 1

    # Health score (0-100)
    health = _compute_health(reqs, blueprints, wo_by_status, test_by_status, total_ac)

    return {
        "project_id": project_id,
        "project_name": project.name,
        "health_score": health,
        "requirements": {
            "total": len(reqs),
            "by_status": req_by_status,
            "by_priority": req_by_priority,
            "ai_generated": ai_gen_count,
            "total_acceptance_criteria": total_ac,
            "avg_ac_per_req": round(total_ac / len(reqs), 1) if reqs else 0,
        },
        "blueprints": {
            "total": len(blueprints),
            "work_orders_by_blueprint": wo_by_blueprint,
        },
        "work_orders": {
            "total": total_wos,
            "by_status": wo_by_status,
            "completion_pct": completion_pct,
        },
        "tests": {
            "total": total_tests,
            "by_status": test_by_status,
            "pass_rate": pass_rate,
        },
        "recent_activity": {
            "by_action": activity_by_action,
            "total_events": len(audit_logs),
        },
    }


def _compute_health(reqs, blueprints, wo_by_status, test_by_status, total_ac) -> int:
    score = 0
    # Requirements exist (20pts)
    if reqs:
        score += 10
        if len(reqs) >= 3:
            score += 10
    # Has blueprints (15pts)
    if blueprints:
        score += 15
    # Requirements have AC (15pts)
    if total_ac > 0:
        score += 10
        if total_ac >= len(reqs) * 2:
            score += 5
    # Work orders progress (25pts)
    total_wos = sum(wo_by_status.values())
    if total_wos > 0:
        score += 10
        completed = wo_by_status.get("completed", 0)
        pct = completed / total_wos
        score += int(pct * 15)
    # Test coverage (25pts)
    total_tests = sum(test_by_status.values())
    if total_tests > 0:
        score += 10
        passed = test_by_status.get("passed", 0)
        pct = passed / total_tests
        score += int(pct * 15)
    return min(100, score)


@router.get("/summary")
async def global_summary(db: AsyncSession = Depends(get_db)):
    """Global summary across all projects."""
    proj_result = await db.execute(select(Project))
    projects = proj_result.scalars().all()

    total_reqs = 0
    total_bps = 0
    total_wos = 0
    total_tests = 0

    for p in projects:
        r = await db.execute(select(func.count()).select_from(Requirement).where(Requirement.project_id == p.id))
        total_reqs += r.scalar() or 0
        b = await db.execute(select(func.count()).select_from(Blueprint).where(Blueprint.project_id == p.id))
        total_bps += b.scalar() or 0

    wo_r = await db.execute(select(func.count()).select_from(WorkOrder))
    total_wos = wo_r.scalar() or 0
    t_r = await db.execute(select(func.count()).select_from(TestCase))
    total_tests = t_r.scalar() or 0

    return {
        "total_projects": len(projects),
        "total_requirements": total_reqs,
        "total_blueprints": total_bps,
        "total_work_orders": total_wos,
        "total_tests": total_tests,
    }
