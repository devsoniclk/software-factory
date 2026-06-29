"""Configuration API — agent instructions, doc templates, WO scope strategies, blueprint categories."""
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from backend.models.engine import get_db
from backend.models.database import AgentInstruction, CustomDocTemplate, WOScopeStrategy, uid, now_iso

router = APIRouter(prefix="/config", tags=["config"])

# ── Agent Instructions ────────────────────────────────────────────────────────

class InstructionBody(BaseModel):
    module: str
    instructions: str
    active: bool = True

@router.get("/project/{project_id}/instructions")
async def list_instructions(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentInstruction).where(AgentInstruction.project_id == project_id))
    return [{"id": i.id, "project_id": i.project_id, "module": i.module, "instructions": i.instructions, "active": i.active, "updated_at": i.updated_at} for i in result.scalars().all()]

@router.put("/project/{project_id}/instructions/{module}")
async def upsert_instruction(project_id: str, module: str, body: InstructionBody, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentInstruction).where(AgentInstruction.project_id == project_id, AgentInstruction.module == module))
    inst = result.scalar_one_or_none()
    if inst:
        inst.instructions = body.instructions
        inst.active = body.active
        inst.updated_at = now_iso()
    else:
        inst = AgentInstruction(id=uid(), project_id=project_id, module=module, instructions=body.instructions, active=body.active)
        db.add(inst)
    await db.commit()
    return {"id": inst.id, "module": inst.module, "instructions": inst.instructions, "active": inst.active}

@router.delete("/project/{project_id}/instructions/{module}")
async def delete_instruction(project_id: str, module: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentInstruction).where(AgentInstruction.project_id == project_id, AgentInstruction.module == module))
    inst = result.scalar_one_or_none()
    if inst:
        await db.delete(inst)
        await db.commit()
    return {"deleted": module}

# ── Custom Doc Templates ──────────────────────────────────────────────────────

class TemplateBody(BaseModel):
    name: str
    description: str = ""
    template_type: str = "requirement"
    body: str = ""
    variables_json: str = "[]"

@router.get("/doc-templates")
async def list_doc_templates(project_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(CustomDocTemplate)
    if project_id:
        q = q.where((CustomDocTemplate.project_id == project_id) | (CustomDocTemplate.project_id == None))
    result = await db.execute(q.order_by(CustomDocTemplate.created_at.desc()))
    items = result.scalars().all()
    return [{"id": t.id, "project_id": t.project_id, "name": t.name, "description": t.description, "template_type": t.template_type, "body": t.body, "variables_json": t.variables_json, "is_default": t.is_default, "created_at": t.created_at} for t in items]

@router.post("/doc-templates")
async def create_doc_template(body: TemplateBody, project_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    tmpl = CustomDocTemplate(id=uid(), project_id=project_id, name=body.name, description=body.description, template_type=body.template_type, body=body.body, variables_json=body.variables_json)
    db.add(tmpl)
    await db.commit()
    return {"id": tmpl.id, "name": tmpl.name, "template_type": tmpl.template_type}

@router.patch("/doc-templates/{tmpl_id}")
async def update_doc_template(tmpl_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    tmpl = await db.get(CustomDocTemplate, tmpl_id)
    if not tmpl:
        raise HTTPException(404, "Template not found")
    for f in ("name", "description", "body", "variables_json"):
        if f in body:
            setattr(tmpl, f, body[f])
    await db.commit()
    return {"id": tmpl.id, "name": tmpl.name}

@router.delete("/doc-templates/{tmpl_id}")
async def delete_doc_template(tmpl_id: str, db: AsyncSession = Depends(get_db)):
    tmpl = await db.get(CustomDocTemplate, tmpl_id)
    if tmpl:
        await db.delete(tmpl)
        await db.commit()
    return {"deleted": tmpl_id}

# ── WO Scope Strategies ───────────────────────────────────────────────────────

BUILTIN_STRATEGIES = [
    {"id": "feature-slice", "name": "Feature Slice", "description": "One WO per user-facing feature end-to-end.", "prompt_addendum": "Break down work orders as complete vertical slices: each WO delivers a user-facing feature end-to-end including UI, API, and data layer.", "is_builtin": True},
    {"id": "specialist", "name": "Specialist", "description": "One WO per discipline (frontend, backend, DB, etc.).", "prompt_addendum": "Break down work orders by specialist discipline: one WO for frontend, one for backend API, one for database schema, etc.", "is_builtin": True},
    {"id": "vertical-slice", "name": "Vertical Slice", "description": "Thin slice through all layers per requirement.", "prompt_addendum": "Each work order implements one requirement as a thin vertical slice through all architecture layers.", "is_builtin": True},
    {"id": "milestone", "name": "Milestone", "description": "Group by delivery milestone or sprint.", "prompt_addendum": "Group work orders by delivery milestone: each WO represents a batch of functionality that can be delivered and demoed together.", "is_builtin": True},
]

@router.get("/wo-strategies")
async def list_wo_strategies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WOScopeStrategy).order_by(WOScopeStrategy.created_at))
    custom = [{"id": s.id, "name": s.name, "description": s.description, "prompt_addendum": s.prompt_addendum, "is_builtin": s.is_builtin, "created_at": s.created_at} for s in result.scalars().all()]
    return BUILTIN_STRATEGIES + custom

@router.post("/wo-strategies")
async def create_wo_strategy(body: dict, db: AsyncSession = Depends(get_db)):
    s = WOScopeStrategy(id=uid(), name=body.get("name",""), description=body.get("description",""), prompt_addendum=body.get("prompt_addendum",""))
    db.add(s)
    await db.commit()
    return {"id": s.id, "name": s.name}

@router.patch("/wo-strategies/{sid}")
async def update_wo_strategy(sid: str, body: dict, db: AsyncSession = Depends(get_db)):
    s = await db.get(WOScopeStrategy, sid)
    if not s:
        raise HTTPException(404, "Strategy not found")
    for f in ("name", "description", "prompt_addendum"):
        if f in body:
            setattr(s, f, body[f])
    await db.commit()
    return {"id": s.id, "name": s.name}

@router.delete("/wo-strategies/{sid}")
async def delete_wo_strategy(sid: str, db: AsyncSession = Depends(get_db)):
    s = await db.get(WOScopeStrategy, sid)
    if s and not s.is_builtin:
        await db.delete(s)
        await db.commit()
    return {"deleted": sid}
