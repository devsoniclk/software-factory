"""Read-only Reporting API — metrics, usage, flag counts for external integrations."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from backend.models.engine import get_db
from backend.models.database import (
    Project, Requirement, Blueprint, WorkOrder, TestCase,
    Feedback, TokenUsageLog, Notification
)

router = APIRouter(prefix="/reporting", tags=["reporting"])

@router.get("/project/{project_id}")   # alias for frontend
@router.get("/project/{project_id}/summary")
async def project_summary(project_id: str, db: AsyncSession = Depends(get_db)):
    """Full metrics snapshot for a project."""
    req_count = (await db.execute(select(func.count()).select_from(Requirement).where(Requirement.project_id == project_id))).scalar() or 0
    bp_count = (await db.execute(select(func.count()).select_from(Blueprint).where(Blueprint.project_id == project_id))).scalar() or 0

    wos = (await db.execute(select(WorkOrder).join(Blueprint, WorkOrder.blueprint_id == Blueprint.id).where(Blueprint.project_id == project_id))).scalars().all()
    wo_by_status = {}
    for wo in wos:
        status_key = wo.status.value if hasattr(wo.status, 'value') else str(wo.status)
        wo_by_status[status_key] = wo_by_status.get(status_key, 0) + 1

    tests = (await db.execute(select(TestCase).join(Requirement, TestCase.requirement_id == Requirement.id).where(Requirement.project_id == project_id))).scalars().all()
    test_passed = sum(1 for t in tests if str(t.status) in ("TestStatus.passed", "passed"))
    test_total = len(tests)

    feedback_count = (await db.execute(select(func.count()).select_from(Feedback).where(Feedback.project_id == project_id))).scalar() or 0

    # DriftAlert is optional — may not exist in all deployments
    drift_open = 0
    try:
        from backend.models.database import DriftAlert
        drift_open = (await db.execute(select(func.count()).select_from(DriftAlert).where(DriftAlert.project_id == project_id, DriftAlert.status == "open"))).scalar() or 0
    except (ImportError, Exception):
        pass

    notif_unread = (await db.execute(select(func.count()).select_from(Notification).where(Notification.project_id == project_id, Notification.read == False))).scalar() or 0

    return {
        "project_id": project_id,
        "requirements": {"total": req_count},
        "blueprints": {"total": bp_count},
        "work_orders": {"total": len(wos), "by_status": wo_by_status},
        "tests": {"total": test_total, "passed": test_passed, "pass_rate": round(test_passed / test_total, 2) if test_total else 0},
        "feedback": {"total": feedback_count},
        "drift_alerts": {"open": drift_open},
        "notifications": {"unread": notif_unread},
    }

@router.get("/usage")
async def token_usage_summary(db: AsyncSession = Depends(get_db)):
    """Global token usage summary."""
    rows = (await db.execute(select(TokenUsageLog).order_by(TokenUsageLog.timestamp.desc()).limit(1000))).scalars().all()
    total = sum(r.total_tokens for r in rows)
    by_agent = {}
    for r in rows:
        by_agent[r.agent_type] = by_agent.get(r.agent_type, 0) + r.total_tokens
    return {"total_tokens": total, "call_count": len(rows), "by_agent": by_agent}
