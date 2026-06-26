"""Plugin registry — stub for custom AI agent plugins."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/plugins", tags=["plugins"])

# In-memory store (persists per process; extend with DB later)
_registry: dict[str, dict] = {}

BUILTIN_PLUGINS = [
    {
        "id": "req-generator",
        "name": "Requirement Generator",
        "description": "AI agent that generates software requirements from a project description.",
        "version": "1.0.0",
        "author": "1024 Studio",
        "enabled": True,
        "builtin": True,
        "category": "ai",
        "config_schema": {},
    },
    {
        "id": "blueprint-composer",
        "name": "Blueprint Composer",
        "description": "Generates system blueprints from requirements using DSL grammar.",
        "version": "1.0.0",
        "author": "1024 Studio",
        "enabled": True,
        "builtin": True,
        "category": "ai",
        "config_schema": {},
    },
    {
        "id": "test-generator",
        "name": "Test Case Generator",
        "description": "Creates acceptance test cases from requirement acceptance criteria.",
        "version": "1.0.0",
        "author": "1024 Studio",
        "enabled": True,
        "builtin": True,
        "category": "ai",
        "config_schema": {},
    },
]


class PluginRegister(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    version: Optional[str] = "0.1.0"
    author: Optional[str] = ""
    category: Optional[str] = "custom"
    endpoint: Optional[str] = None
    config: Optional[dict] = {}


@router.get("")
def list_plugins():
    custom = list(_registry.values())
    return {"builtin": BUILTIN_PLUGINS, "custom": custom}


@router.post("/register")
def register_plugin(body: PluginRegister):
    if body.id in [p["id"] for p in BUILTIN_PLUGINS]:
        raise HTTPException(400, "Cannot override a builtin plugin id")
    _registry[body.id] = {
        **body.model_dump(),
        "enabled": True,
        "builtin": False,
    }
    return _registry[body.id]


@router.delete("/{plugin_id}")
def delete_plugin(plugin_id: str):
    if plugin_id not in _registry:
        raise HTTPException(404, "Plugin not found or is builtin")
    del _registry[plugin_id]
    return {"deleted": plugin_id}


@router.patch("/{plugin_id}/toggle")
def toggle_plugin(plugin_id: str, enabled: bool):
    if plugin_id in _registry:
        _registry[plugin_id]["enabled"] = enabled
        return _registry[plugin_id]
    # Allow toggling builtins in memory
    for p in BUILTIN_PLUGINS:
        if p["id"] == plugin_id:
            p["enabled"] = enabled
            return p
    raise HTTPException(404, "Plugin not found")
