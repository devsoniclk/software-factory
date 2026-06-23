"""AI endpoints — calls agents, creates DB records, logs audit."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.engine import get_db
from backend.models.database import (
    Requirement, Blueprint, WorkOrder, TestCase, Feedback, Project, uid,
)
from backend.models.schemas import (
    GenerateRequirementsRequest, GenerateBlueprintRequest,
    GenerateWorkOrdersRequest, GenerateTestsRequest, ParseFeedbackRequest,
)
from backend.services.audit_service import audit_service
from backend.agents.requirements_agent import generate_requirements
from backend.agents.blueprint_agent import generate_blueprint
from backend.agents.work_order_agent import generate_work_orders
from backend.agents.test_agent import generate_tests
from backend.agents.feedback_agent import parse_feedback

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/generate-requirements")
async def ai_generate_requirements(body: GenerateRequirementsRequest, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, body.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        results = await generate_requirements(body.project_description)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {str(e)}")
    created = []
    for item in results:
        req = Requirement(
            id=uid(),
            project_id=body.project_id,
            title=item.get("title", "Untitled"),
            description=item.get("description", ""),
            priority=item.get("priority", 3),
            acceptance_criteria_json=json.dumps(item.get("acceptance_criteria", [])),
            ai_generated=True,
            created_by="ai",
        )
        db.add(req)
        await db.flush()
        await audit_service.log_create(db, "requirement", req.id, {"title": req.title}, actor="ai")
        created.append({"id": req.id, "title": req.title})
    await db.commit()
    return {"created": len(created), "requirements": created}


@router.post("/generate-blueprint")
async def ai_generate_blueprint(body: GenerateBlueprintRequest, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, body.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        result = await generate_blueprint(body.project_description)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {str(e)}")
    bp = Blueprint(
        id=uid(),
        project_id=body.project_id,
        name=result.get("name", "AI Blueprint"),
        description=result.get("description", ""),
        decisions_json=json.dumps(result.get("decisions", [])),
        components_json=json.dumps(result.get("components", [])),
        constraints_json=json.dumps(result.get("constraints", [])),
        version=1,
    )
    db.add(bp)
    await db.commit()
    await db.refresh(bp)
    await audit_service.log_create(db, "blueprint", bp.id, {"name": bp.name}, actor="ai")
    return {"id": bp.id, "name": bp.name, "version": bp.version}


@router.post("/generate-work-orders")
async def ai_generate_work_orders(body: GenerateWorkOrdersRequest, db: AsyncSession = Depends(get_db)):
    bp = await db.get(Blueprint, body.blueprint_id)
    if not bp:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    # Fetch related requirements
    result = await db.execute(select(Requirement).where(Requirement.project_id == bp.project_id))
    requirements = result.scalars().all()
    req_list = [{"title": r.title, "description": r.description} for r in requirements]
    try:
        work_orders = await generate_work_orders(
            {"name": bp.name, "description": bp.description, "decisions": json.loads(bp.decisions_json or "[]")},
            req_list,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {str(e)}")
    created = []
    for item in work_orders:
        wo = WorkOrder(
            id=uid(),
            blueprint_id=body.blueprint_id,
            title=item.get("title", "Untitled"),
            description=item.get("description", ""),
            context_json=json.dumps(item.get("structured_context", {})),
        )
        db.add(wo)
        await db.flush()
        await audit_service.log_create(db, "work_order", wo.id, {"title": wo.title}, actor="ai")
        created.append({"id": wo.id, "title": wo.title})
    await db.commit()
    return {"created": len(created), "work_orders": created}


@router.post("/generate-tests")
async def ai_generate_tests(body: GenerateTestsRequest, db: AsyncSession = Depends(get_db)):
    req = await db.get(Requirement, body.requirement_id)
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    try:
        test_cases = await generate_tests(
            {"title": req.title, "description": req.description, "acceptance_criteria": json.loads(req.acceptance_criteria_json or "[]")}
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {str(e)}")
    created = []
    for item in test_cases:
        tc = TestCase(
            id=uid(),
            requirement_id=body.requirement_id,
            name=item.get("name", "Unnamed Test"),
            description=item.get("description", ""),
            test_type=item.get("test_type", "unit"),
        )
        db.add(tc)
        await db.flush()
        await audit_service.log_create(db, "test_case", tc.id, {"name": tc.name}, actor="ai")
        created.append({"id": tc.id, "name": tc.name})
    await db.commit()
    return {"created": len(created), "test_cases": created}


@router.post("/parse-feedback")
async def ai_parse_feedback(body: ParseFeedbackRequest, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, body.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        parsed = await parse_feedback(body.feedback_text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI parsing failed: {str(e)}")
    fb = Feedback(
        id=uid(),
        project_id=body.project_id,
        source=body.source,
        raw_text=body.feedback_text,
        parsed_tasks_json=json.dumps(parsed.get("tasks", [])),
        status="parsed",
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)
    await audit_service.log_create(db, "feedback", fb.id, {"project_id": body.project_id}, actor="ai")
    return {"id": fb.id, "sentiment": parsed.get("sentiment", ""), "summary": parsed.get("summary", ""), "tasks": parsed.get("tasks", [])}
