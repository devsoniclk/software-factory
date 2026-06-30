"""Document mindmap API — interactive graph of requirement/blueprint links."""
import json
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from backend.models.engine import get_db
from backend.models.database import Requirement, Blueprint, WorkOrder, Feedback, KGNode, KGEdge

router = APIRouter(prefix="/mindmap", tags=["mindmap"])

@router.get("/project/{project_id}")
async def get_mindmap(
    project_id: str,
    include_types: Optional[str] = Query("requirements,blueprints,work_orders"),
    db: AsyncSession = Depends(get_db),
):
    """Build a mindmap graph of all document links in a project."""
    include = set((include_types or "").split(","))
    nodes = []
    edges = []

    # Requirements
    reqs = []
    if "requirements" in include:
        reqs = (await db.execute(select(Requirement).where(Requirement.project_id == project_id))).scalars().all()
        for r in reqs:
            nodes.append({
                "id": r.id, "type": "requirement", "label": r.req_id or r.id[:8],
                "title": r.title, "status": r.status.value if r.status else None, "priority": r.priority,
                "color": "#0071E3",
            })

    # Blueprints
    bps = []
    if "blueprints" in include:
        bps = (await db.execute(select(Blueprint).where(Blueprint.project_id == project_id))).scalars().all()
        for b in bps:
            nodes.append({
                "id": b.id, "type": "blueprint", "label": b.bp_id or b.id[:8],
                "title": b.name, "color": "#8b5cf6",
            })

    # Work Orders
    if "work_orders" in include:
        wos = (await db.execute(
            select(WorkOrder).join(Blueprint, WorkOrder.blueprint_id == Blueprint.id)
            .where(Blueprint.project_id == project_id)
        )).scalars().all()
        for w in wos:
            nodes.append({
                "id": w.id, "type": "work_order", "label": w.id[:8],
                "title": w.title, "status": w.status.value if w.status else None, "color": "#f59e0b",
            })
            # Edge: blueprint → work order
            edges.append({"source": w.blueprint_id, "target": w.id, "label": "has_wo"})

    # KG edges for req→blueprint relationships
    if reqs and bps:
        kg_result = await db.execute(
            select(KGEdge).where(KGEdge.source_id.in_([r.id for r in reqs]))
        )
        for edge in kg_result.scalars().all():
            edges.append({"source": edge.source_id, "target": edge.target_id, "label": edge.relationship})

    return {
        "project_id": project_id,
        "nodes": nodes,
        "edges": edges,
        "node_count": len(nodes),
        "edge_count": len(edges),
    }

@router.patch("/project/{project_id}/edge")
async def update_edge(project_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    """Update or create an edge between two nodes (bidirectional editing)."""
    source_id = body.get("source_id")
    target_id = body.get("target_id")
    relationship = body.get("relationship", "related_to")
    if not source_id or not target_id:
        from fastapi import HTTPException
        raise HTTPException(400, "source_id and target_id required")
    # Upsert KGEdge
    existing = await db.get(KGEdge, (source_id, target_id, relationship))
    if existing:
        existing.weight = body.get("weight", 1.0)
    else:
        edge = KGEdge(source_id=source_id, target_id=target_id, relationship=relationship, weight=body.get("weight", 1.0))
        db.add(edge)
    await db.commit()
    return {"source_id": source_id, "target_id": target_id, "relationship": relationship}

@router.delete("/project/{project_id}/edge")
async def delete_edge(project_id: str, source_id: str = Query(...), target_id: str = Query(...), relationship: str = Query("related_to"), db: AsyncSession = Depends(get_db)):
    edge = await db.get(KGEdge, (source_id, target_id, relationship))
    if edge:
        await db.delete(edge)
        await db.commit()
    return {"deleted": True}
