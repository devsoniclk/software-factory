"""Work Order extras — duplication check, merge proposals, phase readiness review."""
import json
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.engine import get_db
from backend.models.database import WorkOrder, Blueprint, Requirement

router = APIRouter(prefix="/wo-extras", tags=["wo_extras"])

@router.get("/project/{project_id}/dedup")
async def dedup_check(project_id: str, threshold: float = Query(0.6), db: AsyncSession = Depends(get_db)):
    """Find potentially duplicate work orders using title similarity."""
    result = await db.execute(
        select(WorkOrder).join(Blueprint, WorkOrder.blueprint_id == Blueprint.id)
        .where(Blueprint.project_id == project_id)
    )
    wos = result.scalars().all()

    def similarity(a: str, b: str) -> float:
        a_words = set(a.lower().split())
        b_words = set(b.lower().split())
        if not a_words or not b_words:
            return 0.0
        return len(a_words & b_words) / len(a_words | b_words)

    duplicates = []
    checked = set()
    for i, wo1 in enumerate(wos):
        for j, wo2 in enumerate(wos):
            if i >= j:
                continue
            key = (wo1.id, wo2.id)
            if key in checked:
                continue
            checked.add(key)
            sim = similarity(wo1.title, wo2.title)
            if sim >= threshold:
                duplicates.append({
                    "wo1": {"id": wo1.id, "wo_id": wo1.id[:8], "title": wo1.title, "status": str(wo1.status)},
                    "wo2": {"id": wo2.id, "wo_id": wo2.id[:8], "title": wo2.title, "status": str(wo2.status)},
                    "similarity": round(sim, 2),
                    "merge_suggestion": f"Consider merging '{wo1.title}' and '{wo2.title}' — they cover similar scope.",
                })

    duplicates.sort(key=lambda x: x["similarity"], reverse=True)
    return {"project_id": project_id, "duplicate_pairs": len(duplicates), "pairs": duplicates[:20]}


@router.get("/project/{project_id}/phase-review")
async def phase_review(project_id: str, db: AsyncSession = Depends(get_db)):
    """AI summary of phase readiness — are requirements well-defined, WOs complete, tests passing?"""
    reqs = (await db.execute(select(Requirement).where(Requirement.project_id == project_id))).scalars().all()
    bps = (await db.execute(select(Blueprint).where(Blueprint.project_id == project_id))).scalars().all()
    wos_result = await db.execute(
        select(WorkOrder).join(Blueprint, WorkOrder.blueprint_id == Blueprint.id)
        .where(Blueprint.project_id == project_id)
    )
    wos = wos_result.scalars().all()

    req_approved = sum(1 for r in reqs if str(r.status) in ("ReqStatus.approved", "approved"))
    wo_completed = sum(1 for w in wos if str(w.status) in ("WOStatus.completed", "completed"))
    wo_blocked = sum(1 for w in wos if str(w.status) in ("WOStatus.blocked", "blocked"))

    prompt = f"""You are a project manager reviewing phase readiness for a software project.

Stats:
- Requirements: {len(reqs)} total, {req_approved} approved
- Blueprints: {len(bps)} defined
- Work Orders: {len(wos)} total, {wo_completed} completed, {wo_blocked} blocked

Requirements sample:
{chr(10).join([f"- [{r.req_id or r.id[:8]}] {r.title} ({r.status})" for r in reqs[:8]])}

Work order statuses:
{chr(10).join([f"- {w.id[:8]}: {w.title[:60]} ({w.status})" for w in wos[:10]])}

Provide a concise phase readiness assessment (3-4 sentences) covering:
1. Overall readiness score (0-100)
2. Key risks or blockers
3. What should be done before moving to the next phase"""

    from backend.services.llm_client import llm_client
    assessment = await llm_client.complete(prompt, agent_type="phase_reviewer")

    return {
        "project_id": project_id,
        "stats": {
            "requirements": {"total": len(reqs), "approved": req_approved},
            "blueprints": len(bps),
            "work_orders": {"total": len(wos), "completed": wo_completed, "blocked": wo_blocked},
        },
        "assessment": assessment,
    }
