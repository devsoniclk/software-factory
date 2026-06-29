"""Artifacts API — upload files as agent context (notes, mockups, legacy docs)."""
import os
import hashlib
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.engine import get_db
from backend.models.database import Artifact, uid, now_iso

router = APIRouter(prefix="/artifacts", tags=["artifacts"])

ARTIFACTS_DIR = os.path.expanduser("~/1024Studio/artifacts")


def _artifact_out(a: Artifact) -> dict:
    return {
        "id": a.id, "project_id": a.project_id, "filename": a.filename,
        "content_type": a.content_type, "size_bytes": a.size_bytes,
        "description": a.description, "uploaded_at": a.uploaded_at,
        "has_text": bool(a.text_content),
        "text_preview": a.text_content[:200] if a.text_content else "",
    }


@router.get("/project/{project_id}")
async def list_artifacts(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Artifact).where(Artifact.project_id == project_id).order_by(Artifact.uploaded_at.desc())
    )
    return [_artifact_out(a) for a in result.scalars().all()]


@router.post("/project/{project_id}")
async def upload_artifact(
    project_id: str,
    file: UploadFile = File(...),
    description: str = Form(""),
    db: AsyncSession = Depends(get_db),
):
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    content = await file.read()
    artifact_id = uid()
    ext = os.path.splitext(file.filename or "")[1]
    storage_filename = f"{artifact_id}{ext}"
    storage_path = os.path.join(ARTIFACTS_DIR, storage_filename)
    with open(storage_path, "wb") as f:
        f.write(content)

    # Extract text for common types
    text_content = ""
    ct = (file.content_type or "").lower()
    if ct.startswith("text/") or ext in (".md", ".txt", ".rst", ".csv"):
        try:
            text_content = content.decode("utf-8", errors="replace")[:20000]
        except Exception:
            pass

    artifact = Artifact(
        id=artifact_id, project_id=project_id,
        filename=file.filename or "upload",
        content_type=file.content_type or "application/octet-stream",
        size_bytes=len(content), storage_path=storage_path,
        description=description, text_content=text_content,
    )
    db.add(artifact)
    await db.commit()
    return _artifact_out(artifact)


@router.get("/{artifact_id}/text")
async def get_artifact_text(artifact_id: str, db: AsyncSession = Depends(get_db)):
    artifact = await db.get(Artifact, artifact_id)
    if not artifact:
        raise HTTPException(404, "Artifact not found")
    return {"id": artifact.id, "filename": artifact.filename, "text_content": artifact.text_content}


@router.patch("/{artifact_id}")
async def update_artifact(artifact_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    artifact = await db.get(Artifact, artifact_id)
    if not artifact:
        raise HTTPException(404, "Artifact not found")
    if "description" in body:
        artifact.description = body["description"]
    if "text_content" in body:
        artifact.text_content = body["text_content"]
    await db.commit()
    return _artifact_out(artifact)


@router.delete("/{artifact_id}")
async def delete_artifact(artifact_id: str, db: AsyncSession = Depends(get_db)):
    artifact = await db.get(Artifact, artifact_id)
    if not artifact:
        raise HTTPException(404, "Artifact not found")
    if artifact.storage_path and os.path.exists(artifact.storage_path):
        try:
            os.remove(artifact.storage_path)
        except OSError:
            pass
    await db.delete(artifact)
    await db.commit()
    return {"deleted": artifact_id}
