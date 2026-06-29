"""Global search API — full-text search across requirements, blueprints, work orders, feedback."""
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from backend.models.engine import get_db
from backend.models.database import Requirement, Blueprint, WorkOrder, Feedback

router = APIRouter(prefix="/search", tags=["search"])

@router.get("")
async def global_search(
    q: str = Query(..., min_length=1),
    project_id: Optional[str] = Query(None),
    types: Optional[str] = Query(None),  # comma-sep: "requirements,blueprints,work_orders,feedback"
    limit: int = Query(20),
    db: AsyncSession = Depends(get_db),
):
    """Full-text search across all document types."""
    include = set((types or "requirements,blueprints,work_orders,feedback").split(","))
    results = []
    query_lower = q.lower()

    if "requirements" in include:
        rq = select(Requirement)
        if project_id:
            rq = rq.where(Requirement.project_id == project_id)
        rq = rq.where(or_(
            Requirement.title.ilike(f"%{q}%"),
            Requirement.description.ilike(f"%{q}%"),
            Requirement.req_id.ilike(f"%{q}%"),
        )).limit(limit)
        reqs = (await db.execute(rq)).scalars().all()
        for r in reqs:
            score = (2 if query_lower in r.title.lower() else 0) + (1 if query_lower in r.description.lower() else 0)
            results.append({
                "type": "requirement", "id": r.id, "project_id": r.project_id,
                "title": r.title, "snippet": r.description[:200],
                "meta": {"req_id": r.req_id, "status": str(r.status), "priority": r.priority},
                "score": score,
            })

    if "blueprints" in include:
        bq = select(Blueprint)
        if project_id:
            bq = bq.where(Blueprint.project_id == project_id)
        bq = bq.where(or_(
            Blueprint.name.ilike(f"%{q}%"),
            Blueprint.description.ilike(f"%{q}%"),
            Blueprint.dsl_content.ilike(f"%{q}%"),
        )).limit(limit)
        bps = (await db.execute(bq)).scalars().all()
        for b in bps:
            score = (2 if query_lower in b.name.lower() else 0) + (1 if query_lower in (b.description or "").lower() else 0)
            results.append({
                "type": "blueprint", "id": b.id, "project_id": b.project_id,
                "title": b.name, "snippet": b.description[:200],
                "meta": {"bp_id": b.bp_id},
                "score": score,
            })

    if "work_orders" in include:
        # WOs don't have project_id directly — join through blueprint
        wq = select(WorkOrder)
        if project_id:
            wq = wq.join(Blueprint, WorkOrder.blueprint_id == Blueprint.id).where(Blueprint.project_id == project_id)
        wq = wq.where(or_(
            WorkOrder.title.ilike(f"%{q}%"),
            WorkOrder.description.ilike(f"%{q}%"),
        )).limit(limit)
        wos = (await db.execute(wq)).scalars().all()
        for w in wos:
            score = (2 if query_lower in w.title.lower() else 0) + (1 if query_lower in w.description.lower() else 0)
            results.append({
                "type": "work_order", "id": w.id, "project_id": None,
                "title": w.title, "snippet": w.description[:200],
                "meta": {"wo_id": w.id[:8], "status": str(w.status)},
                "score": score,
            })

    if "feedback" in include:
        fq = select(Feedback)
        if project_id:
            fq = fq.where(Feedback.project_id == project_id)
        fq = fq.where(Feedback.raw_text.ilike(f"%{q}%")).limit(limit)
        fbs = (await db.execute(fq)).scalars().all()
        for f in fbs:
            results.append({
                "type": "feedback", "id": f.id, "project_id": f.project_id,
                "title": f.raw_text[:80], "snippet": f.raw_text[:200],
                "meta": {"source": f.source, "status": f.status},
                "score": 1,
            })

    results.sort(key=lambda x: x["score"], reverse=True)
    return {"query": q, "total": len(results), "results": results[:limit]}
