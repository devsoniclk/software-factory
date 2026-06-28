"""Document version history API."""
import json
import difflib
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.engine import get_db
from backend.models.database import DocumentVersion

router = APIRouter(prefix="/versions", tags=["versions"])


async def snapshot(
    db: AsyncSession,
    entity_type: str,
    entity_id: str,
    content: dict,
    version_number: int,
    summary: str = "",
    created_by: str = "user",
) -> DocumentVersion:
    """Record an immutable content snapshot."""
    dv = DocumentVersion(
        entity_type=entity_type,
        entity_id=entity_id,
        version_number=version_number,
        content_json=json.dumps(content),
        summary=summary,
        created_by=created_by,
    )
    db.add(dv)
    await db.commit()
    return dv


@router.get("/{entity_type}/{entity_id}")
async def list_versions(
    entity_type: str,
    entity_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DocumentVersion)
        .where(
            DocumentVersion.entity_type == entity_type,
            DocumentVersion.entity_id == entity_id,
        )
        .order_by(DocumentVersion.version_number.desc())
        .offset(skip)
        .limit(limit)
    )
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "entity_type": r.entity_type,
            "entity_id": r.entity_id,
            "version_number": r.version_number,
            "summary": r.summary,
            "created_by": r.created_by,
            "created_at": r.created_at,
        }
        for r in rows
    ]


@router.get("/{entity_type}/{entity_id}/diff")
async def diff_versions(
    entity_type: str,
    entity_id: str,
    v1: int = Query(..., description="First version number"),
    v2: int = Query(..., description="Second version number"),
    db: AsyncSession = Depends(get_db),
):
    """Return a structured field-level diff between two versions."""

    async def _fetch(version_number: int):
        result = await db.execute(
            select(DocumentVersion).where(
                DocumentVersion.entity_type == entity_type,
                DocumentVersion.entity_id == entity_id,
                DocumentVersion.version_number == version_number,
            )
        )
        return result.scalar_one_or_none()

    row1 = await _fetch(v1)
    row2 = await _fetch(v2)

    if not row1:
        raise HTTPException(status_code=404, detail=f"Version {v1} not found")
    if not row2:
        raise HTTPException(status_code=404, detail=f"Version {v2} not found")

    content1 = json.loads(row1.content_json) if row1.content_json else {}
    content2 = json.loads(row2.content_json) if row2.content_json else {}

    all_keys = sorted(set(list(content1.keys()) + list(content2.keys())))
    fields = []
    for key in all_keys:
        before = content1.get(key)
        after = content2.get(key)
        changed = before != after
        entry = {"field": key, "before": before, "after": after, "changed": changed}
        if isinstance(before, str) or isinstance(after, str):
            before_str = str(before) if before is not None else ""
            after_str = str(after) if after is not None else ""
            before_lines = before_str.splitlines(keepends=True)
            after_lines = after_str.splitlines(keepends=True)
            lines_diff = []
            for line in difflib.unified_diff(before_lines, after_lines, lineterm=""):
                if line.startswith("+++") or line.startswith("---") or line.startswith("@@"):
                    continue
                if line.startswith("+"):
                    lines_diff.append({"type": "added", "text": line[1:]})
                elif line.startswith("-"):
                    lines_diff.append({"type": "removed", "text": line[1:]})
                else:
                    lines_diff.append({"type": "unchanged", "text": line[1:]})
            entry["lines_diff"] = lines_diff
        fields.append(entry)

    return {"v1": v1, "v2": v2, "fields": fields}


@router.get("/{entity_type}/{entity_id}/{version_number}")
async def get_version(
    entity_type: str,
    entity_id: str,
    version_number: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DocumentVersion).where(
            DocumentVersion.entity_type == entity_type,
            DocumentVersion.entity_id == entity_id,
            DocumentVersion.version_number == version_number,
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Version not found")
    return {
        "id": row.id,
        "entity_type": row.entity_type,
        "entity_id": row.entity_id,
        "version_number": row.version_number,
        "content": json.loads(row.content_json),
        "summary": row.summary,
        "created_by": row.created_by,
        "created_at": row.created_at,
    }
