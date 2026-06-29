"""Persistent Agent Chat Panel API — cross-module chat with context awareness."""
import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from backend.models.engine import get_db
from backend.models.database import AgentChatMessage, Requirement, Blueprint, WorkOrder, uid, now_iso

router = APIRouter(prefix="/agent-chat", tags=["agent_chat"])

class ChatRequest(BaseModel):
    message: str
    context_module: str = ""
    context_entity_id: str = ""
    context_entity_type: str = ""

def _msg_out(m: AgentChatMessage) -> dict:
    return {"id": m.id, "project_id": m.project_id, "role": m.role, "content": m.content,
            "context_module": m.context_module, "context_entity_id": m.context_entity_id,
            "created_at": m.created_at}

@router.get("/project/{project_id}/history")
async def get_history(project_id: str, limit: int = Query(50), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AgentChatMessage).where(AgentChatMessage.project_id == project_id)
        .order_by(AgentChatMessage.created_at.asc()).limit(limit)
    )
    return [_msg_out(m) for m in result.scalars().all()]

@router.post("/project/{project_id}/message")
async def send_message(project_id: str, body: ChatRequest, db: AsyncSession = Depends(get_db)):
    """Send a message to the persistent AI agent and get a response."""
    # Save user message
    user_msg = AgentChatMessage(
        id=uid(), project_id=project_id, role="user", content=body.message,
        context_module=body.context_module, context_entity_id=body.context_entity_id,
    )
    db.add(user_msg)
    await db.flush()

    # Build context from entity if provided
    context_text = ""
    if body.context_entity_id and body.context_entity_type:
        try:
            if body.context_entity_type == "requirement":
                entity = await db.get(Requirement, body.context_entity_id)
                if entity:
                    context_text = f"Current requirement: {entity.title}\n{entity.description}"
            elif body.context_entity_type == "blueprint":
                entity = await db.get(Blueprint, body.context_entity_id)
                if entity:
                    context_text = f"Current blueprint: {entity.name}\n{entity.description}\n\nDSL:\n{entity.dsl_content[:1000]}"
            elif body.context_entity_type == "work_order":
                entity = await db.get(WorkOrder, body.context_entity_id)
                if entity:
                    context_text = f"Current work order: {entity.title}\n{entity.description}"
        except Exception:
            pass

    # Fetch recent history for context
    history_result = await db.execute(
        select(AgentChatMessage).where(AgentChatMessage.project_id == project_id)
        .order_by(AgentChatMessage.created_at.desc()).limit(10)
    )
    history = list(reversed(history_result.scalars().all()))
    history_text = "\n".join([f"{m.role.upper()}: {m.content[:300]}" for m in history[:-1]])  # exclude current

    prompt = f"""You are a persistent AI assistant embedded in 1024 Studio, an AI-native SDLC tool. You help users with requirements, blueprints, work orders, and software development planning.

{f'Current context ({body.context_module} module):' if body.context_module else ''}
{context_text}

{f'Recent conversation:' + chr(10) + history_text if history_text else ''}

User: {body.message}

Respond helpfully and concisely. If the user asks you to create, update, or analyze project artifacts, explain what you'd suggest and how to do it in the app."""

    from backend.services.llm_client import llm_client
    response_text = await llm_client.complete(prompt, agent_type="agent_chat")

    # Save assistant response
    assistant_msg = AgentChatMessage(
        id=uid(), project_id=project_id, role="assistant", content=response_text,
        context_module=body.context_module,
    )
    db.add(assistant_msg)
    await db.commit()

    return {
        "user_message": _msg_out(user_msg),
        "assistant_message": _msg_out(assistant_msg),
    }

@router.delete("/project/{project_id}/history")
async def clear_history(project_id: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import delete
    await db.execute(delete(AgentChatMessage).where(AgentChatMessage.project_id == project_id))
    await db.commit()
    return {"cleared": True}
