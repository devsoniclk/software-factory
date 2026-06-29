"""External API keys — user-managed keys for headless automation."""
import hashlib
import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from backend.models.engine import get_db
from backend.models.database import ExternalAPIKey, uid, now_iso

router = APIRouter(prefix="/api-keys", tags=["api_keys"])

class KeyCreate(BaseModel):
    name: str
    description: str = ""
    scopes: list = ["read"]
    expires_at: Optional[str] = None

def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()

def _key_out(k: ExternalAPIKey, show_key: bool = False, raw_key: str = "") -> dict:
    out = {
        "id": k.id, "name": k.name, "description": k.description,
        "key_prefix": k.key_prefix, "scopes_json": k.scopes_json,
        "last_used_at": k.last_used_at, "expires_at": k.expires_at,
        "enabled": k.enabled, "created_at": k.created_at,
    }
    if show_key:
        out["key"] = raw_key  # Only shown once on creation
    return out

@router.get("")
async def list_keys(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ExternalAPIKey).order_by(ExternalAPIKey.created_at.desc()))
    return [_key_out(k) for k in result.scalars().all()]

@router.post("")
async def create_key(body: KeyCreate, db: AsyncSession = Depends(get_db)):
    """Create a new API key. The raw key is only shown once."""
    import json
    raw = "sf_" + secrets.token_urlsafe(32)
    key = ExternalAPIKey(
        id=uid(), name=body.name, description=body.description,
        key_hash=_hash_key(raw), key_prefix=raw[:10],
        scopes_json=json.dumps(body.scopes),
        expires_at=body.expires_at,
    )
    db.add(key)
    await db.commit()
    return _key_out(key, show_key=True, raw_key=raw)

@router.patch("/{key_id}")
async def update_key(key_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    key = await db.get(ExternalAPIKey, key_id)
    if not key:
        raise HTTPException(404, "Key not found")
    if "enabled" in body:
        key.enabled = body["enabled"]
    if "name" in body:
        key.name = body["name"]
    if "description" in body:
        key.description = body["description"]
    await db.commit()
    return _key_out(key)

@router.delete("/{key_id}")
async def delete_key(key_id: str, db: AsyncSession = Depends(get_db)):
    key = await db.get(ExternalAPIKey, key_id)
    if key:
        await db.delete(key)
        await db.commit()
    return {"deleted": key_id}
