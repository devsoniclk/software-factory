"""QA Flows — generate Playwright tests from acceptance criteria, run them."""
import json
import subprocess
import tempfile
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from backend.models.engine import get_db
from backend.models.database import QAFlow, Blueprint, Requirement, uid, now_iso

router = APIRouter(prefix="/qa-flows", tags=["qa_flows"])


class FlowCreate(BaseModel):
    name: str
    target_url: str = ""
    description: str = ""
    blueprint_id: Optional[str] = None


class GenerateRequest(BaseModel):
    blueprint_id: str
    target_url: str = "http://localhost:3000"
    requirement_ids: Optional[list] = None


def _flow_out(f: QAFlow) -> dict:
    return {
        "id": f.id, "project_id": f.project_id, "blueprint_id": f.blueprint_id,
        "name": f.name, "description": f.description, "target_url": f.target_url,
        "test_code": f.test_code, "status": f.status,
        "last_run_at": f.last_run_at, "last_run_output": f.last_run_output,
        "last_run_passed": f.last_run_passed, "last_run_failed": f.last_run_failed,
        "ai_generated": f.ai_generated, "created_at": f.created_at,
    }


@router.get("/project/{project_id}")
async def list_flows(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(QAFlow).where(QAFlow.project_id == project_id).order_by(QAFlow.created_at.desc())
    )
    return [_flow_out(f) for f in result.scalars().all()]


@router.post("/project/{project_id}")
async def create_flow(project_id: str, body: FlowCreate, db: AsyncSession = Depends(get_db)):
    flow = QAFlow(
        id=uid(), project_id=project_id, name=body.name,
        description=body.description, target_url=body.target_url,
        blueprint_id=body.blueprint_id,
    )
    db.add(flow)
    await db.commit()
    await db.refresh(flow)
    return _flow_out(flow)


@router.post("/project/{project_id}/generate")
async def generate_flow(project_id: str, body: GenerateRequest, db: AsyncSession = Depends(get_db)):
    """Use LLM to generate Playwright TypeScript test code from blueprint ACs."""
    bp = await db.get(Blueprint, body.blueprint_id)
    if not bp or bp.project_id != project_id:
        raise HTTPException(404, "Blueprint not found")

    # Gather acceptance criteria from requirements
    req_result = await db.execute(
        select(Requirement).where(Requirement.project_id == project_id)
    )
    reqs = req_result.scalars().all()
    if body.requirement_ids:
        reqs = [r for r in reqs if r.id in body.requirement_ids]

    ac_lines = []
    for req in reqs[:10]:  # cap at 10 requirements to keep prompt manageable
        try:
            acs = json.loads(req.acceptance_criteria_json or "[]")
        except Exception:
            acs = []
        for ac in acs[:3]:
            text = ac if isinstance(ac, str) else ac.get("text", str(ac))
            ac_lines.append(f"- [{req.req_id or req.id}] {text}")

    prompt = f"""Generate a complete Playwright TypeScript test file for the following blueprint and acceptance criteria.

Blueprint: {bp.name}
Description: {bp.description or "(none)"}
DSL:
{bp.dsl_content or "(no DSL)"}

Acceptance Criteria:
{chr(10).join(ac_lines) if ac_lines else "(no acceptance criteria defined)"}

Target URL: {body.target_url}

Write a complete Playwright test file with:
1. Import statements (use @playwright/test)
2. One describe block named after the blueprint
3. One test per acceptance criterion (name the test after the criterion)
4. Use page.goto('{body.target_url}') to navigate
5. Use realistic selectors (data-testid, role, text)
6. Each test should be independent and self-contained
7. Add expect() assertions that verify the acceptance criterion

Return ONLY the TypeScript code, no explanation."""

    from backend.services.llm_client import llm_client
    test_code = await llm_client.chat_text([{"role": "user", "content": prompt}], agent_type="qa_generator")

    # Clean up markdown fences if LLM wrapped in ```
    import re
    test_code = re.sub(r'^```(?:typescript|ts)?\n?', '', test_code.strip(), flags=re.MULTILINE)
    test_code = re.sub(r'\n?```$', '', test_code.strip(), flags=re.MULTILINE)

    flow = QAFlow(
        id=uid(), project_id=project_id, blueprint_id=body.blueprint_id,
        name=f"{bp.name} — QA Suite",
        description=f"Auto-generated from {len(reqs)} requirement(s)",
        target_url=body.target_url, test_code=test_code.strip(),
        ai_generated=True, status="ready",
    )
    db.add(flow)
    await db.commit()
    await db.refresh(flow)
    return _flow_out(flow)


@router.patch("/{flow_id}")
async def update_flow(flow_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    flow = await db.get(QAFlow, flow_id)
    if not flow:
        raise HTTPException(404, "Flow not found")
    for field in ("name", "description", "target_url", "test_code"):
        if field in body:
            setattr(flow, field, body[field])
    await db.commit()
    return _flow_out(flow)


@router.delete("/{flow_id}")
async def delete_flow(flow_id: str, db: AsyncSession = Depends(get_db)):
    flow = await db.get(QAFlow, flow_id)
    if not flow:
        raise HTTPException(404, "Flow not found")
    await db.delete(flow)
    await db.commit()
    return {"deleted": flow_id}


@router.post("/{flow_id}/run")
async def run_flow(flow_id: str, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Execute the test with Playwright if installed, otherwise return the code."""
    flow = await db.get(QAFlow, flow_id)
    if not flow:
        raise HTTPException(404, "Flow not found")
    if not flow.test_code.strip():
        raise HTTPException(400, "No test code to run")

    # Check if playwright is available
    try:
        result = subprocess.run(["npx", "playwright", "--version"], capture_output=True, text=True, timeout=5)
        has_playwright = result.returncode == 0
    except Exception:
        has_playwright = False

    if not has_playwright:
        return {
            "status": "no_runner",
            "message": "Playwright is not installed. Install with: npm install -D @playwright/test && npx playwright install chromium",
            "test_code": flow.test_code,
        }

    flow.status = "running"
    await db.commit()
    background_tasks.add_task(_execute_playwright, flow_id, flow.test_code)
    return {"status": "running", "flow_id": flow_id}


async def _execute_playwright(flow_id: str, test_code: str):
    """Run the generated test code using Playwright test runner."""
    from backend.models.engine import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        flow = await db.get(QAFlow, flow_id)
        if not flow:
            return

        with tempfile.TemporaryDirectory() as tmpdir:
            # Write package.json stub
            pkg = {"name": "qa-run", "version": "1.0.0", "devDependencies": {"@playwright/test": "^1.40.0"}}
            with open(os.path.join(tmpdir, "package.json"), "w") as f:
                json.dump(pkg, f)
            # Write the test file
            test_file = os.path.join(tmpdir, "test.spec.ts")
            with open(test_file, "w") as f:
                f.write(test_code)

            try:
                result = subprocess.run(
                    ["npx", "--yes", "playwright", "test", test_file, "--reporter=json"],
                    capture_output=True, text=True, timeout=60, cwd=tmpdir,
                    env={**os.environ, "CI": "1"},
                )
                output = result.stdout + result.stderr
                # Parse JSON output for pass/fail counts
                passed = output.count('"status":"passed"')
                failed = output.count('"status":"failed"')
                flow.last_run_output = output[:4000]
                flow.last_run_passed = passed
                flow.last_run_failed = failed
                flow.status = "passed" if failed == 0 and passed > 0 else "failed"
            except subprocess.TimeoutExpired:
                flow.last_run_output = "Run timed out after 60 seconds"
                flow.status = "failed"
            except Exception as e:
                flow.last_run_output = str(e)
                flow.status = "failed"

            flow.last_run_at = now_iso()
            await db.commit()
