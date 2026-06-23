"""Knowledge graph API router."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.engine import get_db
from backend.services.knowledge_graph import kg
from backend.models.database import uid

router = APIRouter(prefix="/knowledge-graph", tags=["knowledge_graph"])


@router.get("/project/{project_id}")
async def get_project_graph(project_id: str, db: AsyncSession = Depends(get_db)):
    return await kg.get_graph(db, project_id)


@router.get("/neighbors/{node_id}")
async def get_neighbors(node_id: str, db: AsyncSession = Depends(get_db)):
    result = await kg.neighbors(db, node_id)
    if not result.get("node"):
        raise HTTPException(status_code=404, detail="Node not found")
    return result


@router.post("/nodes")
async def create_node(body: dict, db: AsyncSession = Depends(get_db)):
    node_id = body.get("id", uid())
    node = await kg.add_node(
        db,
        node_id=node_id,
        project_id=body["project_id"],
        node_type=body["node_type"],
        title=body["title"],
        content=body.get("content", ""),
        metadata=body.get("metadata", {}),
    )
    return {"id": node.id, "type": node.node_type, "title": node.title}


@router.post("/edges")
async def create_edge(body: dict, db: AsyncSession = Depends(get_db)):
    edge = await kg.add_edge(
        db,
        source_id=body["source_id"],
        target_id=body["target_id"],
        relationship=body["relationship"],
        weight=body.get("weight", 1.0),
        metadata=body.get("metadata", {}),
    )
    return {"source": edge.source_id, "target": edge.target_id, "relationship": edge.relationship}
