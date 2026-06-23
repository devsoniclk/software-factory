"""SQLite-based knowledge graph using KGNode / KGEdge models."""
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from backend.models.database import KGNode, KGEdge, uid, now_iso


class KnowledgeGraph:
    """Graph operations over the SQLite kg_nodes / kg_edges tables."""

    async def add_node(
        self,
        db: AsyncSession,
        node_id: str,
        project_id: str,
        node_type: str,
        title: str,
        content: str = "",
        metadata: dict | None = None,
    ) -> KGNode:
        node = KGNode(
            id=node_id,
            project_id=project_id,
            node_type=node_type,
            title=title,
            content=content,
            metadata_json=json.dumps(metadata or {}),
        )
        db.merge(node)
        await db.commit()
        return node

    async def add_edge(
        self,
        db: AsyncSession,
        source_id: str,
        target_id: str,
        relationship: str,
        weight: float = 1.0,
        metadata: dict | None = None,
    ) -> KGEdge:
        edge = KGEdge(
            source_id=source_id,
            target_id=target_id,
            relationship=relationship,
            weight=weight,
            metadata_json=json.dumps(metadata or {}),
        )
        db.merge(edge)
        await db.commit()
        return edge

    async def get_graph(self, db: AsyncSession, project_id: str) -> dict:
        """Return full graph for a project as nodes + edges lists."""
        rows = await db.execute(
            text("SELECT id, node_type, title, content, metadata_json FROM kg_nodes WHERE project_id = :pid"),
            {"pid": project_id},
        )
        nodes = [
            {"id": r[0], "type": r[1], "title": r[2], "content": r[3], "metadata": json.loads(r[4] or "{}")}
            for r in rows.fetchall()
        ]
        node_ids = {n["id"] for n in nodes}
        if not node_ids:
            return {"nodes": [], "edges": []}
        placeholders = ",".join(f":n{i}" for i in range(len(node_ids)))
        params = {f"n{i}": nid for i, nid in enumerate(node_ids)}
        edge_rows = await db.execute(
            text(f"SELECT source_id, target_id, relationship, weight, metadata_json FROM kg_edges WHERE source_id IN ({placeholders})"),
            params,
        )
        edges = [
            {"source": r[0], "target": r[1], "relationship": r[2], "weight": r[3], "metadata": json.loads(r[4] or "{}")}
            for r in edge_rows.fetchall()
        ]
        return {"nodes": nodes, "edges": edges}

    async def neighbors(self, db: AsyncSession, node_id: str) -> dict:
        """Return neighboring nodes and connecting edges for a given node."""
        node_row = await db.execute(
            text("SELECT id, node_type, title, content, metadata_json, project_id FROM kg_nodes WHERE id = :nid"),
            {"nid": node_id},
        )
        node_r = node_row.fetchone()
        if not node_r:
            return {"node": None, "neighbors": [], "edges": []}

        node = {"id": node_r[0], "type": node_r[1], "title": node_r[2], "content": node_r[3], "metadata": json.loads(node_r[4] or "{}")}

        # Outgoing edges
        out_rows = await db.execute(
            text("SELECT source_id, target_id, relationship, weight, metadata_json FROM kg_edges WHERE source_id = :nid"),
            {"nid": node_id},
        )
        # Incoming edges
        in_rows = await db.execute(
            text("SELECT source_id, target_id, relationship, weight, metadata_json FROM kg_edges WHERE target_id = :nid"),
            {"nid": node_id},
        )
        out_edges = out_rows.fetchall()
        in_edges = in_rows.fetchall()

        edges = []
        neighbor_ids = set()
        for r in out_edges:
            edges.append({"source": r[0], "target": r[1], "relationship": r[2], "weight": r[3], "metadata": json.loads(r[4] or "{}")})
            neighbor_ids.add(r[1])
        for r in in_edges:
            edges.append({"source": r[0], "target": r[1], "relationship": r[2], "weight": r[3], "metadata": json.loads(r[4] or "{}")})
            neighbor_ids.add(r[0])

        neighbors = []
        if neighbor_ids:
            placeholders = ",".join(f":n{i}" for i in range(len(neighbor_ids)))
            params = {f"n{i}": nid for i, nid in enumerate(neighbor_ids)}
            n_rows = await db.execute(
                text(f"SELECT id, node_type, title, content, metadata_json FROM kg_nodes WHERE id IN ({placeholders})"),
                params,
            )
            neighbors = [
                {"id": r[0], "type": r[1], "title": r[2], "content": r[3], "metadata": json.loads(r[4] or "{}")}
                for r in n_rows.fetchall()
            ]

        return {"node": node, "neighbors": neighbors, "edges": edges}

    async def sync_entity(
        self,
        db: AsyncSession,
        entity_type: str,
        entity_id: str,
        project_id: str,
        title: str,
        content: str = "",
        metadata: dict | None = None,
        linked_to: list[tuple[str, str]] | None = None,
    ):
        """Create or update a node and optionally add edges."""
        await self.add_node(db, entity_id, project_id, entity_type, title, content, metadata)
        for target_id, rel in (linked_to or []):
            await self.add_edge(db, entity_id, target_id, rel)


kg = KnowledgeGraph()
