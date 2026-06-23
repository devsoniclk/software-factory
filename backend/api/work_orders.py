"""Work Orders CRUD router with status and output updates."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.engine import get_db
from backend.models.database import WorkOrder, Blueprint, WOStatus, uid, now_iso
from backend.models.schemas import WorkOrderCreate, WorkOrderResponse
from backend.services.audit_service import audit_service

router = APIRouter(prefix="/blueprints/{blueprint_id}/work-orders", tags=["work_orders"])

WO_VALID_TRANSITIONS = {
    "pending": ["in_progress"],
    "in_progress": ["completed", "blocked"],
    "blocked": ["in_progress"],
    "completed": [],
}


@router.post("", response_model=WorkOrderResponse)
async def create_work_order(blueprint_id: str, body: WorkOrderCreate, db: AsyncSession = Depends(get_db)):
    bp = await db.get(Blueprint, blueprint_id)
    if not bp:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    wo = WorkOrder(
        id=uid(),
        blueprint_id=blueprint_id,
        title=body.title,
        description=body.description,
        requirement_ids_json=json.dumps(body.requirement_ids),
        context_json=json.dumps(body.context),
    )
    db.add(wo)
    await db.commit()
    await db.refresh(wo)
    await audit_service.log_create(db, "work_order", wo.id, {"title": wo.title, "blueprint_id": blueprint_id})
    return wo


@router.get("", response_model=list[WorkOrderResponse])
async def list_work_orders(blueprint_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(WorkOrder).where(WorkOrder.blueprint_id == blueprint_id).order_by(WorkOrder.created_at.desc())
    )
    return result.scalars().all()


@router.patch("/{wo_id}/status")
async def update_work_order_status(blueprint_id: str, wo_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    wo = await db.get(WorkOrder, wo_id)
    if not wo or wo.blueprint_id != blueprint_id:
        raise HTTPException(status_code=404, detail="Work order not found")
    new_status = body.get("status", "")
    old_status = wo.status.value if hasattr(wo.status, "value") else wo.status
    allowed = WO_VALID_TRANSITIONS.get(old_status, [])
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail=f"Cannot transition from '{old_status}' to '{new_status}'. Allowed: {allowed}")
    wo.status = WOStatus(new_status)
    await db.commit()
    await db.refresh(wo)
    await audit_service.log_status_change(db, "work_order", wo_id, old_status, new_status)
    return {"id": wo.id, "status": wo.status.value}


@router.patch("/{wo_id}/output", response_model=WorkOrderResponse)
async def update_work_order_output(blueprint_id: str, wo_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    wo = await db.get(WorkOrder, wo_id)
    if not wo or wo.blueprint_id != blueprint_id:
        raise HTTPException(status_code=404, detail="Work order not found")
    before = {"ai_output": wo.ai_output}
    wo.ai_output = body.get("ai_output", "")
    if "git_commit" in body:
        wo.git_commit = body["git_commit"]
    await db.commit()
    await db.refresh(wo)
    await audit_service.log_update(db, "work_order", wo.id, before, {"ai_output": wo.ai_output})
    return wo
