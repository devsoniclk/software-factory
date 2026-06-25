"""Blueprint DSL parser.

Parses Markdown-style DSL text into structured nodes and KG edges.

DSL Format
----------
## Component: AuthService
**Technology:** FastAPI, JWT
**Responsibilities:** Handle auth and token issuance
**Interfaces:** POST /auth/login, GET /auth/me
**Depends on:** #Database, #UserService

## Model: `User`
**Fields:** id (UUID), email (str), name (str)
**Relationships:** has many Session

## ADR: @UseJWT
**Context:** Need stateless auth
**Decision:** JWT tokens with 1-hour expiry
**Rationale:** Horizontal scaling without shared session store
**Consequences:** Token revocation requires a denylist

Reference conventions
---------------------
  #Name   — Component reference
  `Name`  — Model reference
  @Name   — ADR reference
"""
import re
from typing import List, Dict, Any, Tuple

_SECTION_RE = re.compile(
    r"^##\s+(Component|Model|ADR):\s*(.+)$",
    re.IGNORECASE | re.MULTILINE,
)
_PROP_RE = re.compile(r"^\*\*(.+?)\*\*:\s*(.+)$", re.MULTILINE)

# Reference patterns
_COMP_REF_RE = re.compile(r"#([A-Za-z][A-Za-z0-9_]*)")
_MODEL_REF_RE = re.compile(r"`([A-Za-z][A-Za-z0-9_]*)`")
_ADR_REF_RE = re.compile(r"@([A-Za-z][A-Za-z0-9_]*)")


def _node_id(project_id: str, node_type: str, name: str) -> str:
    slug = re.sub(r"[^a-z0-9]", "-", name.strip().lower())
    return f"{project_id}:{node_type}:{slug}"


def _extract_refs(text: str) -> List[Tuple[str, str]]:
    """Extract (target_id_suffix, relationship) pairs from a text block."""
    refs = []
    for m in _COMP_REF_RE.finditer(text):
        refs.append((f"component:{m.group(1).lower()}", "depends_on"))
    for m in _MODEL_REF_RE.finditer(text):
        refs.append((f"model:{m.group(1).lower()}", "uses_model"))
    for m in _ADR_REF_RE.finditer(text):
        refs.append((f"adr:{m.group(1).lower()}", "governed_by"))
    return refs


def parse_dsl(dsl_content: str, project_id: str, blueprint_id: str) -> Dict[str, Any]:
    """
    Parse DSL text and return:
      {
        "nodes": [ { id, type, name, properties } ],
        "edges": [ { source_id, target_id, relationship } ],
        "unresolved": [ "reference string that matched no declared node" ]
      }
    """
    nodes: List[Dict] = []
    edges: List[Dict] = []

    # Split text into sections
    splits = list(_SECTION_RE.finditer(dsl_content))
    sections: List[Tuple[str, str, str]] = []
    for i, m in enumerate(splits):
        node_type = m.group(1).lower()   # component | model | adr
        raw_name = m.group(2).strip().strip("`@#")
        end = splits[i + 1].start() if i + 1 < len(splits) else len(dsl_content)
        body = dsl_content[m.end():end].strip()
        sections.append((node_type, raw_name, body))

    # Collect declared names per type for unresolved tracking
    declared: Dict[str, set] = {"component": set(), "model": set(), "adr": set()}
    for node_type, name, _ in sections:
        declared[node_type].add(name.lower())

    for node_type, name, body in sections:
        nid = _node_id(project_id, node_type, name)
        props = {m.group(1).lower(): m.group(2).strip() for m in _PROP_RE.finditer(body)}

        nodes.append({
            "id": nid,
            "type": node_type,
            "name": name,
            "blueprint_id": blueprint_id,
            "properties": props,
        })

        # Build edges from references in body
        for suffix, rel in _extract_refs(body):
            ref_type, ref_slug = suffix.split(":", 1)
            target_nid = f"{project_id}:{suffix}"
            edges.append({
                "source_id": nid,
                "target_id": target_nid,
                "relationship": rel,
            })

    # Detect unresolved references
    all_ids = {n["id"] for n in nodes}
    unresolved = [e["target_id"] for e in edges if e["target_id"] not in all_ids]

    return {"nodes": nodes, "edges": edges, "unresolved": list(set(unresolved))}


async def sync_to_kg(parsed: Dict, project_id: str, db) -> None:
    """Persist parsed nodes and edges into the knowledge graph."""
    from backend.services.knowledge_graph import kg

    for n in parsed["nodes"]:
        await kg.add_node(
            db,
            node_id=n["id"],
            project_id=project_id,
            node_type=n["type"],
            title=n["name"],
            content=str(n.get("properties", {})),
            metadata={"blueprint_id": n["blueprint_id"], "properties": n.get("properties", {})},
        )

    for e in parsed["edges"]:
        # Only create edges where both endpoints exist in declared nodes
        await kg.add_edge(
            db,
            source_id=e["source_id"],
            target_id=e["target_id"],
            relationship=e["relationship"],
        )
