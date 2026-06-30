"""AI endpoints: calls agents, creates DB records, logs audit."""
from typing import Any, Optional, List
import json
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
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
from backend.agents.test_agent import generate_tests, generate_and_write_tests
from backend.agents.feedback_agent import parse_feedback, parse_feedback_with_context
from backend.api.middleware import ai_limiter
from backend.api.security import (
    validate_codebase_path,
    defend_prompt,
    make_bounded_executor,
)

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/generate-requirements")
async def ai_generate_requirements(
    request: Request,
    body: GenerateRequirementsRequest,
    db: AsyncSession = Depends(get_db),
):
    ai_limiter.check(request)

    project = await db.get(Project, body.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    safe_desc = defend_prompt(body.project_description)

    try:
        results = await generate_requirements(safe_desc)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {e}")

    created = []
    for item in results:
        req = Requirement(
            id=uid(),
            project_id=body.project_id,
            title=item.get("title", "Untitled")[:1000],
            description=item.get("description", ""),
            priority=item.get("priority", 3),
            acceptance_criteria_json=json.dumps(item.get("acceptance_criteria", [])),
            ai_generated=True,
            created_by="ai",
        )
        db.add(req)
        await db.flush()
        await audit_service.log_create(db, "requirement", req.id, {"title": req.title}, actor="ai")
        created.append({"id": req.id, "title": req.title, "priority": req.priority})

    await db.commit()
    return {"project_id": body.project_id, "created": len(created), "requirements": created}


@router.post("/generate-blueprint")
async def ai_generate_blueprint(
    request: Request,
    body: GenerateBlueprintRequest,
    db: AsyncSession = Depends(get_db),
):
    ai_limiter.check(request)

    project = await db.get(Project, body.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    safe_path = validate_codebase_path(body.codebase_path)
    safe_desc = defend_prompt(body.project_description)
    executor = make_bounded_executor(safe_path) if safe_path else None

    try:
        result = await generate_blueprint(
            safe_desc,
            codebase_path=safe_path,
            tool_executor=executor,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {e}")

    bp = Blueprint(
        id=uid(),
        project_id=body.project_id,
        name=result.get("name", "AI Blueprint")[:500],
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
    return {
        "id": bp.id,
        "name": bp.name,
        "version": bp.version,
        "architecture_style": result.get("architecture_style"),
        "component_count": len(result.get("components", [])),
        "decision_count": len(result.get("decisions", [])),
    }


@router.post("/generate-work-orders")
async def ai_generate_work_orders(
    request: Request,
    body: GenerateWorkOrdersRequest,
    db: AsyncSession = Depends(get_db),
):
    ai_limiter.check(request)

    bp = await db.get(Blueprint, body.blueprint_id)
    if not bp:
        raise HTTPException(status_code=404, detail="Blueprint not found")

    result = await db.execute(
        select(Requirement).where(Requirement.project_id == bp.project_id)
    )
    requirements = result.scalars().all()
    req_list = [
        {"title": r.title, "description": r.description, "priority": r.priority}
        for r in requirements
    ]

    safe_path = validate_codebase_path(body.codebase_path)
    executor = make_bounded_executor(safe_path) if safe_path else None

    try:
        work_orders = await generate_work_orders(
            {
                "name": bp.name,
                "description": bp.description,
                "decisions": json.loads(bp.decisions_json or "[]"),
                "components": json.loads(bp.components_json or "[]"),
            },
            req_list,
            codebase_path=safe_path,
            tool_executor=executor,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {e}")

    created = []
    for item in work_orders:
        wo = WorkOrder(
            id=uid(),
            blueprint_id=body.blueprint_id,
            title=item.get("title", "Untitled")[:1000],
            description=item.get("description", ""),
            context_json=json.dumps(item.get("structured_context", {})),
        )
        db.add(wo)
        await db.flush()
        await audit_service.log_create(db, "work_order", wo.id, {"title": wo.title}, actor="ai")
        created.append({
            "id": wo.id,
            "title": wo.title,
            "priority": item.get("priority", 3),
            "estimated_hours": item.get("estimated_hours"),
        })

    await db.commit()
    return {"created": len(created), "work_orders": created}


@router.post("/generate-tests")
async def ai_generate_tests(
    request: Request,
    body: GenerateTestsRequest,
    db: AsyncSession = Depends(get_db),
):
    ai_limiter.check(request)

    req = await db.get(Requirement, body.requirement_id)
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    requirement = {
        "title": req.title,
        "description": req.description,
        "acceptance_criteria": json.loads(req.acceptance_criteria_json or "[]"),
    }

    try:
        test_cases = await generate_tests(requirement)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {e}")

    created = []
    for item in test_cases:
        tc = TestCase(
            id=uid(),
            requirement_id=body.requirement_id,
            name=item.get("name", "Unnamed Test")[:1000],
            description=item.get("description", ""),
            test_type=item.get("test_type", "unit"),
        )
        db.add(tc)
        await db.flush()
        await audit_service.log_create(db, "test_case", tc.id, {"name": tc.name}, actor="ai")
        created.append({
            "id": tc.id,
            "name": tc.name,
            "test_type": tc.test_type,
            "priority": item.get("priority", 2),
        })

    await db.commit()
    return {"created": len(created), "test_cases": created}


class WriteTestsRequest(BaseModel):
    requirement_id: str = Field(..., max_length=50)
    output_path: str = Field(..., max_length=512)
    codebase_path: Optional[str] = Field(None, max_length=512)


@router.post("/write-tests")
async def ai_write_tests(
    request: Request,
    body: WriteTestsRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate AND write a runnable pytest file, then run it."""
    ai_limiter.check(request)

    req = await db.get(Requirement, body.requirement_id)
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    safe_path = validate_codebase_path(body.codebase_path)
    executor = make_bounded_executor(safe_path) if safe_path else None

    requirement = {
        "title": req.title,
        "description": req.description,
        "acceptance_criteria": json.loads(req.acceptance_criteria_json or "[]"),
    }

    try:
        result = await generate_and_write_tests(
            requirement,
            output_path=body.output_path,
            codebase_path=safe_path,
            tool_executor=executor,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Test generation failed: {e}")

    created = []
    for item in result.get("test_cases", []):
        tc = TestCase(
            id=uid(),
            requirement_id=body.requirement_id,
            name=item.get("name", "Unnamed Test")[:1000],
            description=item.get("description", ""),
            test_type=item.get("test_type", "unit"),
        )
        db.add(tc)
        await db.flush()
        created.append({"id": tc.id, "name": tc.name})

    await db.commit()
    return {
        "created": len(created),
        "test_cases": created,
        "file_written": result.get("file"),
    }


@router.post("/parse-feedback")
async def ai_parse_feedback(
    request: Request,
    body: ParseFeedbackRequest,
    db: AsyncSession = Depends(get_db),
):
    ai_limiter.check(request)

    project = await db.get(Project, body.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    safe_path = validate_codebase_path(body.codebase_path)
    safe_text = defend_prompt(body.feedback_text, max_length=32_000)
    executor = make_bounded_executor(safe_path) if safe_path else None

    try:
        parsed = await parse_feedback_with_context(
            safe_text,
            codebase_path=safe_path,
            tool_executor=executor,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI parsing failed: {e}")

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

    return {
        "id": fb.id,
        "sentiment": parsed.get("sentiment", ""),
        "sentiment_score": parsed.get("sentiment_score"),
        "summary": parsed.get("summary", ""),
        "pain_points": parsed.get("pain_points", []),
        "feature_requests": parsed.get("feature_requests", []),
        "tasks": parsed.get("tasks", []),
        "requires_immediate_action": parsed.get("requires_immediate_action", False),
        "user_segment_guess": parsed.get("user_segment_guess"),
    }


@router.post("/projects/{project_id}/blueprints/{blueprint_id}/code-qa")
async def code_grounded_qa(project_id: str, blueprint_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    """Answer a question about a blueprint, grounded in the indexed code."""
    from backend.services.code_index_service import answer_code_question
    question = body.get("question", "")
    repo_id = body.get("repo_id", "")
    if not question:
        raise HTTPException(status_code=400, detail="question is required")

    bp = await db.get(Blueprint, blueprint_id)
    if not bp or bp.project_id != project_id:
        raise HTTPException(status_code=404, detail="Blueprint not found")

    code_context = {"context": "", "symbols": []}
    if repo_id:
        code_context = await answer_code_question(question, repo_id, db)

    # Build grounded prompt
    prompt = f"""You are answering a question about blueprint "{bp.name}".

Blueprint DSL:
{bp.dsl_content or "(no DSL defined)"}

Relevant code context:
{code_context['context'] or "(no code indexed or no matching symbols)"}

Question: {question}

Answer concisely, citing specific code symbols or blueprint components where relevant."""

    from backend.services.llm_client import llm_client
    answer = await llm_client.chat_text([{"role": "user", "content": prompt}], agent_type="code_qa")
    return {
        "blueprint_id": blueprint_id,
        "question": question,
        "answer": answer,
        "symbols_used": code_context["symbols"],
    }
