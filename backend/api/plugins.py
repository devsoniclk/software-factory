"""Plugin registry router — DB-backed so state survives restarts."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from backend.models.engine import get_db
from backend.models.database import Plugin, uid, now_iso

router = APIRouter(prefix="/plugins", tags=["plugins"])

# ── Built-in plugins seeded on first startup ──────────────────────────────────
BUILTIN_PLUGINS = [
    {
        "id": "builtin-requirements-ai",
        "name": "Requirements AI",
        "description": "AI-powered requirement generation and EARS validation",
        "version": "1.0.0",
        "author": "1024 Studio",
        "category": "ai",
        "builtin": True,
    },
    {
        "id": "builtin-blueprint-ai",
        "name": "Blueprint AI",
        "description": "AI-powered architecture blueprint generation",
        "version": "1.0.0",
        "author": "1024 Studio",
        "category": "ai",
        "builtin": True,
    },
    {
        "id": "builtin-test-ai",
        "name": "Test AI",
        "description": "AI-powered test case generation",
        "version": "1.0.0",
        "author": "1024 Studio",
        "category": "ai",
        "builtin": True,
    },
    {
        "id": "builtin-feedback-ai",
        "name": "Feedback AI",
        "description": "AI-powered feedback parsing and task extraction",
        "version": "1.0.0",
        "author": "1024 Studio",
        "category": "ai",
        "builtin": True,
    },
    {
        "id": "builtin-knowledge-graph",
        "name": "Knowledge Graph",
        "description": "Entity relationship graph for requirements, blueprints, and work orders",
        "version": "1.0.0",
        "author": "1024 Studio",
        "category": "visualization",
        "builtin": True,
    },
]


async def seed_builtin_plugins(db: AsyncSession) -> None:
    """Upsert built-in plugin rows (idempotent)."""
    for p in BUILTIN_PLUGINS:
        existing = await db.get(Plugin, p["id"])
        if existing is None:
            db.add(Plugin(
                id=p["id"],
                name=p["name"],
                description=p["description"],
                version=p["version"],
                author=p["author"],
                endpoint=p.get("endpoint"),
                category=p.get("category", "custom"),
                enabled=True,
                builtin=True,
            ))
    await db.commit()


# ── Pydantic I/O ──────────────────────────────────────────────────────────────

class PluginResponse(BaseModel):
    id: str
    name: str
    description: str
    version: str
    author: str
    endpoint: Optional[str]
    category: str
    enabled: bool
    builtin: bool
    created_at: str
    model_config = {"from_attributes": True}


class PluginCreate(BaseModel):
    id: str = Field("", max_length=100)
    name: str = Field(..., max_length=200)
    description: str = Field("", max_length=2000)
    version: str = Field("1.0.0", max_length=50)
    author: str = Field("", max_length=200)
    endpoint: Optional[str] = Field(None, max_length=500)
    category: str = Field("custom", max_length=100)


class PluginUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    version: Optional[str] = Field(None, max_length=50)
    endpoint: Optional[str] = Field(None, max_length=500)
    enabled: Optional[bool] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[PluginResponse])
async def list_plugins(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Plugin).order_by(Plugin.builtin.desc(), Plugin.name))
    return result.scalars().all()


@router.get("/{plugin_id}", response_model=PluginResponse)
async def get_plugin(plugin_id: str, db: AsyncSession = Depends(get_db)):
    plugin = await db.get(Plugin, plugin_id)
    if not plugin:
        raise HTTPException(status_code=404, detail="Plugin not found")
    return plugin


@router.post("", response_model=PluginResponse, status_code=201)
async def create_plugin(body: PluginCreate, db: AsyncSession = Depends(get_db)):
    plugin_id = body.id.strip() or uid()
    existing = await db.get(Plugin, plugin_id)
    if existing:
        raise HTTPException(status_code=409, detail="Plugin ID already exists")
    plugin = Plugin(
        id=plugin_id,
        name=body.name,
        description=body.description,
        version=body.version,
        author=body.author,
        endpoint=body.endpoint,
        category=body.category,
        enabled=True,
        builtin=False,
    )
    db.add(plugin)
    await db.commit()
    await db.refresh(plugin)
    return plugin


@router.patch("/{plugin_id}", response_model=PluginResponse)
async def update_plugin(plugin_id: str, body: PluginUpdate, db: AsyncSession = Depends(get_db)):
    plugin = await db.get(Plugin, plugin_id)
    if not plugin:
        raise HTTPException(status_code=404, detail="Plugin not found")
    if body.name is not None:
        plugin.name = body.name
    if body.description is not None:
        plugin.description = body.description
    if body.version is not None:
        plugin.version = body.version
    if body.endpoint is not None:
        plugin.endpoint = body.endpoint
    if body.enabled is not None:
        plugin.enabled = body.enabled
    await db.commit()
    await db.refresh(plugin)
    return plugin


@router.delete("/{plugin_id}")
async def delete_plugin(plugin_id: str, db: AsyncSession = Depends(get_db)):
    plugin = await db.get(Plugin, plugin_id)
    if not plugin:
        raise HTTPException(status_code=404, detail="Plugin not found")
    if plugin.builtin:
        raise HTTPException(status_code=400, detail="Cannot delete built-in plugins")
    await db.delete(plugin)
    await db.commit()
    return {"deleted": plugin_id}
