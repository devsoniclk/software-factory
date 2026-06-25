"""Document version history API."""
import json
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
