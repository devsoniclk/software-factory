"""Live Assistance API — widget JS, friction events, RAG support chat."""
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from backend.models.engine import get_db
from backend.models.database import FrictionEvent, WorkOrder, Blueprint, uid, now_iso
from backend.services.live_assist_service import generate_widget_js, rag_answer

router = APIRouter(prefix="/live-assist", tags=["live_assist"])


class EventCreate(BaseModel):
    project_id: str
    session_id: str = ""
    event_type: str
    severity: str = "info"
    page_url: str = ""
    element_selector: str = ""
    message: str = ""
    metadata_json: str = "{}"


class ChatRequest(BaseModel):
    project_id: str
    question: str
    page_url: str = ""


class PromoteRequest(BaseModel):
    blueprint_id: str
    title: Optional[str] = None


def _event_out(e: FrictionEvent) -> dict:
    return {
        "id": e.id, "project_id": e.project_id, "session_id": e.session_id,
        "event_type": e.event_type, "severity": e.severity, "page_url": e.page_url,
        "element_selector": e.element_selector, "message": e.message,
        "status": e.status, "promoted_wo_id": e.promoted_wo_id,
        "created_at": e.created_at,
        "metadata": json.loads(e.metadata_json or "{}"),
    }


@router.get("/widget.js")
async def get_widget(project_id: str = Query(...)):
    """Serve the embeddable JavaScript widget for a project."""
    js = generate_widget_js(project_id)
    return PlainTextResponse(js, media_type="application/javascript",
                             headers={"Access-Control-Allow-Origin": "*"})


@router.post("/events")
async def capture_event(body: EventCreate, db: AsyncSession = Depends(get_db)):
    """Receive a friction event from the widget."""
    event = FrictionEvent(
        id=uid(), project_id=body.project_id, session_id=body.session_id,
        event_type=body.event_type, severity=body.severity,
        page_url=body.page_url, element_selector=body.element_selector,
        message=body.message, metadata_json=body.metadata_json,
    )
    db.add(event)
    await db.commit()
    return {"id": event.id, "status": "captured"}


@router.get("/project/{project_id}/events")
async def list_events(
    project_id: str,
    status: str = Query("open"),
    event_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(FrictionEvent).where(FrictionEvent.project_id == project_id)
    if status != "all":
        q = q.where(FrictionEvent.status == status)
    if event_type:
        q = q.where(FrictionEvent.event_type == event_type)
    result = await db.execute(q.order_by(FrictionEvent.created_at.desc()).limit(100))
    return [_event_out(e) for e in result.scalars().all()]


@router.patch("/events/{event_id}/dismiss")
async def dismiss_event(event_id: str, db: AsyncSession = Depends(get_db)):
    event = await db.get(FrictionEvent, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    event.status = "dismissed"
    await db.commit()
    return _event_out(event)


@router.post("/events/{event_id}/promote")
async def promote_to_work_order(event_id: str, body: PromoteRequest, db: AsyncSession = Depends(get_db)):
    """Promote a friction event to a work order."""
    import re
    event = await db.get(FrictionEvent, event_id)
    if not event:
        raise HTTPException(404, "Event not found")

    bp = await db.get(Blueprint, body.blueprint_id)
    if not bp:
        raise HTTPException(404, "Blueprint not found")

    bp.wo_counter = (bp.wo_counter or 0) + 1
    letters = re.sub(r"[^a-zA-Z]", "", bp.name or "").upper()
    prefix = letters[:4] if letters else "WRK"
    wo_id_str = f"WO-{prefix}-{bp.wo_counter:03d}"

    from backend.models.database import WorkOrder, WOStatus
    title = body.title or f"[Friction] {event.event_type.replace('_', ' ').title()} on {event.page_url[:60]}"
    wo = WorkOrder(
        id=uid(), blueprint_id=body.blueprint_id, wo_id=wo_id_str,
        title=title,
        description=f"Promoted from friction event ({event.event_type}):\n{event.message}\nPage: {event.page_url}",
        context_json=json.dumps({"friction_event_id": event_id, "session_id": event.session_id}),
        status=WOStatus.PENDING,
    )
    db.add(wo)
    event.status = "promoted"
    event.promoted_wo_id = wo.id
    await db.commit()
    await db.refresh(wo)
    return {"work_order_id": wo.id, "wo_id": wo_id_str, "event_id": event_id}


@router.post("/chat")
async def support_chat(body: ChatRequest, db: AsyncSession = Depends(get_db)):
    """RAG-powered support chat using requirements and blueprints as context."""
    answer = await rag_answer(body.question, body.project_id, body.page_url, db)
    return {"question": body.question, "answer": answer, "project_id": body.project_id}


@router.get("/project/{project_id}/widget-snippet")
async def get_widget_snippet(project_id: str, api_base: str = Query("http://localhost:8099")):
    """Return the HTML script tag to embed the widget."""
    script_url = f"{api_base}/live-assist/widget.js?project_id={project_id}"
    snippet = f'<script src="{script_url}" defer></script>'
    return {"snippet": snippet, "script_url": script_url}
