"""Feedback themes API — group feedback items into themes, AI-groom themes."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from backend.models.engine import get_db
from backend.models.database import FeedbackTheme, Feedback, uid, now_iso

router = APIRouter(prefix="/feedback-themes", tags=["feedback_themes"])

class ThemeBody(BaseModel):
    name: str
    description: str = ""
    feedback_ids_json: str = "[]"
    color: str = "#0071E3"

def _theme_out(t: FeedbackTheme) -> dict:
    return {"id": t.id, "project_id": t.project_id, "name": t.name, "description": t.description,
            "feedback_ids_json": t.feedback_ids_json, "ai_generated": t.ai_generated,
            "color": t.color, "created_at": t.created_at,
            "feedback_count": len(json.loads(t.feedback_ids_json or "[]"))}

@router.get("/project/{project_id}")
async def list_themes(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FeedbackTheme).where(FeedbackTheme.project_id == project_id).order_by(FeedbackTheme.created_at.desc()))
    return [_theme_out(t) for t in result.scalars().all()]

@router.post("/project/{project_id}")
async def create_theme(project_id: str, body: ThemeBody, db: AsyncSession = Depends(get_db)):
    theme = FeedbackTheme(id=uid(), project_id=project_id, name=body.name, description=body.description,
                          feedback_ids_json=body.feedback_ids_json, color=body.color)
    db.add(theme)
    await db.commit()
    return _theme_out(theme)

@router.patch("/{theme_id}")
async def update_theme(theme_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    theme = await db.get(FeedbackTheme, theme_id)
    if not theme:
        raise HTTPException(404, "Theme not found")
    for f in ("name", "description", "feedback_ids_json", "color"):
        if f in body:
            setattr(theme, f, body[f])
    await db.commit()
    return _theme_out(theme)

@router.delete("/{theme_id}")
async def delete_theme(theme_id: str, db: AsyncSession = Depends(get_db)):
    theme = await db.get(FeedbackTheme, theme_id)
    if theme:
        await db.delete(theme)
        await db.commit()
    return {"deleted": theme_id}

@router.post("/project/{project_id}/groom")
async def groom_themes(project_id: str, db: AsyncSession = Depends(get_db)):
    """Use AI to group feedback items into themes."""
    result = await db.execute(select(Feedback).where(Feedback.project_id == project_id).limit(50))
    feedbacks = result.scalars().all()
    if not feedbacks:
        return {"themes": [], "message": "No feedback to groom"}

    items_text = "\n".join([f"- [{fb.id[:8]}] {fb.raw_text[:200]}" for fb in feedbacks])
    prompt = f"""Analyze these feedback items and group them into 3-7 themes. Each theme should capture a common pattern or topic.

Feedback items:
{items_text}

Return a JSON array of themes, each with:
- name: short theme name (3-5 words)
- description: what this theme covers (1 sentence)
- feedback_ids: array of feedback ID prefixes (first 8 chars) that belong to this theme
- color: a hex color for the theme badge

Return ONLY valid JSON, no explanation."""

    from backend.services.llm_client import llm_client
    import re
    raw = await llm_client.complete(prompt, agent_type="theme_groomer")
    raw = re.sub(r'^```(?:json)?\n?', '', raw.strip(), flags=re.MULTILINE)
    raw = re.sub(r'\n?```$', '', raw.strip(), flags=re.MULTILINE)

    try:
        theme_data = json.loads(raw)
    except Exception:
        return {"error": "AI returned invalid JSON", "raw": raw[:500]}

    # Resolve partial IDs to full IDs
    id_map = {fb.id[:8]: fb.id for fb in feedbacks}
    created = []
    for td in theme_data:
        full_ids = [id_map.get(pid[:8], pid) for pid in td.get("feedback_ids", [])]
        theme = FeedbackTheme(
            id=uid(), project_id=project_id,
            name=td.get("name", "Theme"),
            description=td.get("description", ""),
            feedback_ids_json=json.dumps(full_ids),
            ai_generated=True,
            color=td.get("color", "#0071E3"),
        )
        db.add(theme)
        created.append(_theme_out(theme))

    await db.commit()
    return {"themes": created, "count": len(created)}
