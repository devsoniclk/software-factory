"""ER Diagram API — extracts Model nodes from Blueprint DSL and returns ER-ready data."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.engine import get_db
from backend.models.database import Blueprint, Project
from backend.services.blueprint_parser import parse_dsl

router = APIRouter(prefix="/er-diagram", tags=["er-diagram"])


def _parse_fields(fields_str: str) -> list:
    """Parse 'id (UUID), email (str), name (str)' into [{name, type, pk}]."""
    fields = []
    for part in fields_str.split(","):
        part = part.strip()
        if not part:
            continue
        # Match: fieldname (type) or fieldname: type
        import re
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)\s*[\(:]?\s*([A-Za-z0-9_\[\]|, ]*)\)?$", part)
        if m:
            name = m.group(1).strip()
            typ = m.group(2).strip().rstrip(")").strip() or "str"
            pk = name.lower() in ("id", "uuid", "pk", "primary_key")
            fields.append({"name": name, "type": typ, "pk": pk})
        else:
            fields.append({"name": part, "type": "str", "pk": False})
    return fields


def _parse_relationships(rel_str: str) -> list:
    """Parse 'has many Session, belongs to User' into [{type, target, cardinality}]."""
    rels = []
    for part in rel_str.split(","):
        part = part.strip()
        if not part:
            continue
        import re
        for pattern, card in [
            (r"has many (.+)", "1:N"),
            (r"has one (.+)", "1:1"),
            (r"belongs to (.+)", "N:1"),
            (r"many to many (.+)", "M:N"),
            (r"many-to-many (.+)", "M:N"),
        ]:
            m = re.match(pattern, part, re.IGNORECASE)
            if m:
                rels.append({"type": part.split()[0].lower(), "target": m.group(1).strip(), "cardinality": card})
                break
        else:
            rels.append({"type": "relates_to", "target": part, "cardinality": "1:N"})
    return rels


@router.get("/project/{project_id}")
async def get_project_er_diagram(project_id: str, db: AsyncSession = Depends(get_db)):
    """Return ER diagram data for all blueprints in a project."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    bp_result = await db.execute(
        select(Blueprint).where(Blueprint.project_id == project_id)
    )
    blueprints = bp_result.scalars().all()

    entities = {}
    relationships = []

    for bp in blueprints:
        if not bp.dsl_content or not bp.dsl_content.strip():
            continue
        try:
            parsed = parse_dsl(bp.dsl_content, project_id, bp.id)
        except Exception:
            continue

        for node in parsed["nodes"]:
            if node["type"] != "model":
                continue
            props = node.get("properties", {})
            fields_str = props.get("fields", "")
            rel_str = props.get("relationships", "")

            entity_name = node["name"]
            entities[entity_name] = {
                "name": entity_name,
                "blueprint_id": bp.id,
                "blueprint_name": bp.name,
                "fields": _parse_fields(fields_str),
                "raw_fields": fields_str,
                "raw_relationships": rel_str,
            }

            for rel in _parse_relationships(rel_str):
                relationships.append({
                    "source": entity_name,
                    "target": rel["target"],
                    "cardinality": rel["cardinality"],
                    "label": rel["type"],
                })

    return {
        "project_id": project_id,
        "project_name": project.name,
        "entities": list(entities.values()),
        "relationships": relationships,
        "blueprint_count": len(blueprints),
        "entity_count": len(entities),
    }


@router.get("/blueprint/{blueprint_id}")
async def get_blueprint_er_diagram(blueprint_id: str, db: AsyncSession = Depends(get_db)):
    """Return ER diagram data for a single blueprint."""
    bp = await db.get(Blueprint, blueprint_id)
    if not bp:
        raise HTTPException(status_code=404, detail="Blueprint not found")

    entities = {}
    relationships = []

    if bp.dsl_content and bp.dsl_content.strip():
        try:
            parsed = parse_dsl(bp.dsl_content, bp.project_id, bp.id)
            for node in parsed["nodes"]:
                if node["type"] != "model":
                    continue
                props = node.get("properties", {})
                entity_name = node["name"]
                entities[entity_name] = {
                    "name": entity_name,
                    "fields": _parse_fields(props.get("fields", "")),
                    "raw_fields": props.get("fields", ""),
                    "raw_relationships": props.get("relationships", ""),
                }
                for rel in _parse_relationships(props.get("relationships", "")):
                    relationships.append({
                        "source": entity_name,
                        "target": rel["target"],
                        "cardinality": rel["cardinality"],
                        "label": rel["type"],
                    })
        except Exception:
            pass

    return {
        "blueprint_id": blueprint_id,
        "blueprint_name": bp.name,
        "entities": list(entities.values()),
        "relationships": relationships,
        "entity_count": len(entities),
    }
