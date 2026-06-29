"""Agent hooks API — event-triggered automations."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from backend.models.engine import get_db
from backend.models.database import AgentHook, Notification, uid, now_iso

router = APIRouter(prefix="/hooks", tags=["hooks"])

VALID_EVENTS = ["indexing_complete", "code_push", "wo_completed", "drift_detected", "feedback_received", "qa_failed"]
VALID_ACTIONS = ["generate_work_orders", "scan_drift", "summarize", "notify", "run_qa", "groom_themes"]

class HookBody(BaseModel):
    name: str
    event_type: str
    action: str
    config_json: str = "{}"
    enabled: bool = True

def _hook_out(h: AgentHook) -> dict:
    return {"id": h.id, "project_id": h.project_id, "name": h.name, "event_type": h.event_type,
            "action": h.action, "config_json": h.config_json, "enabled": h.enabled,
            "last_triggered_at": h.last_triggered_at, "last_result": h.last_result, "created_at": h.created_at}

@router.get("/project/{project_id}")
async def list_hooks(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentHook).where(AgentHook.project_id == project_id))
    return [_hook_out(h) for h in result.scalars().all()]

@router.post("/project/{project_id}")
async def create_hook(project_id: str, body: HookBody, db: AsyncSession = Depends(get_db)):
    hook = AgentHook(id=uid(), project_id=project_id, name=body.name, event_type=body.event_type,
                     action=body.action, config_json=body.config_json, enabled=body.enabled)
    db.add(hook)
    await db.commit()
    return _hook_out(hook)

@router.patch("/{hook_id}")
async def update_hook(hook_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    hook = await db.get(AgentHook, hook_id)
    if not hook:
        raise HTTPException(404, "Hook not found")
    for f in ("name", "event_type", "action", "config_json", "enabled"):
        if f in body:
            setattr(hook, f, body[f])
    await db.commit()
    return _hook_out(hook)

@router.delete("/{hook_id}")
async def delete_hook(hook_id: str, db: AsyncSession = Depends(get_db)):
    hook = await db.get(AgentHook, hook_id)
    if hook:
        await db.delete(hook)
        await db.commit()
    return {"deleted": hook_id}

@router.post("/{hook_id}/trigger")
async def trigger_hook(hook_id: str, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Manually trigger a hook."""
    hook = await db.get(AgentHook, hook_id)
    if not hook:
        raise HTTPException(404, "Hook not found")
    hook.last_triggered_at = now_iso()
    hook.last_result = "triggered manually"
    await db.commit()
    # Create a notification
    notif = Notification(id=uid(), project_id=hook.project_id,
                         title=f"Hook triggered: {hook.name}",
                         body=f"Action: {hook.action}", notification_type="info")
    db.add(notif)
    await db.commit()
    return _hook_out(hook)

@router.post("/fire")
async def fire_event(body: dict, db: AsyncSession = Depends(get_db)):
    """Fire an event to trigger matching hooks (called internally by other services)."""
    event_type = body.get("event_type", "")
    project_id = body.get("project_id")
    q = select(AgentHook).where(AgentHook.event_type == event_type, AgentHook.enabled == True)
    if project_id:
        q = q.where(AgentHook.project_id == project_id)
    result = await db.execute(q)
    hooks = result.scalars().all()
    triggered = []
    for hook in hooks:
        hook.last_triggered_at = now_iso()
        hook.last_result = f"fired by event: {event_type}"
        notif = Notification(id=uid(), project_id=hook.project_id,
                             title=f"Hook fired: {hook.name}",
                             body=f"Event: {event_type} → Action: {hook.action}", notification_type="hook")
        db.add(notif)
        triggered.append(hook.id)
    await db.commit()
    return {"triggered": triggered, "count": len(triggered)}
