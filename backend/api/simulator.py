"""Simulator API — crawl a live app and build a spatial map of screens."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from backend.models.engine import get_db
from backend.models.database import SimulatorRun, SimulatorScreen, uid
from backend.services.simulator_service import run_simulator

router = APIRouter(prefix="/simulator", tags=["simulator"])


class RunCreate(BaseModel):
    target_url: str
    max_depth: int = 2


def _run_out(r: SimulatorRun) -> dict:
    return {
        "id": r.id, "project_id": r.project_id, "target_url": r.target_url,
        "status": r.status, "screen_count": r.screen_count, "max_depth": r.max_depth,
        "error_message": r.error_message, "started_at": r.started_at,
        "completed_at": r.completed_at, "created_at": r.created_at,
    }


def _screen_out(s: SimulatorScreen, include_image: bool = False) -> dict:
    out = {
        "id": s.id, "run_id": s.run_id, "route": s.route, "title": s.title,
        "selector_count": s.selector_count, "depth": s.depth, "crawled_at": s.crawled_at,
        "has_screenshot": bool(s.screenshot_b64),
    }
    if include_image:
        out["screenshot_b64"] = s.screenshot_b64
        out["placeholder_svg"] = s.placeholder_svg
    return out


@router.get("/project/{project_id}/runs")
async def list_runs(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SimulatorRun).where(SimulatorRun.project_id == project_id)
        .order_by(SimulatorRun.created_at.desc())
    )
    return [_run_out(r) for r in result.scalars().all()]


@router.post("/project/{project_id}/runs")
async def create_run(
    project_id: str, body: RunCreate,
    background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)
):
    run = SimulatorRun(
        id=uid(), project_id=project_id,
        target_url=body.target_url, max_depth=body.max_depth,
    )
    db.add(run)
    await db.commit()
    background_tasks.add_task(run_simulator, run.id)
    return _run_out(run)


@router.get("/runs/{run_id}")
async def get_run(run_id: str, db: AsyncSession = Depends(get_db)):
    run = await db.get(SimulatorRun, run_id)
    if not run:
        raise HTTPException(404, "Run not found")
    return _run_out(run)


@router.get("/runs/{run_id}/screens")
async def list_screens(run_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SimulatorScreen).where(SimulatorScreen.run_id == run_id)
        .order_by(SimulatorScreen.depth, SimulatorScreen.route)
    )
    return [_screen_out(s, include_image=True) for s in result.scalars().all()]


@router.delete("/runs/{run_id}")
async def delete_run(run_id: str, db: AsyncSession = Depends(get_db)):
    run = await db.get(SimulatorRun, run_id)
    if not run:
        raise HTTPException(404, "Run not found")
    await db.delete(run)
    await db.commit()
    return {"deleted": run_id}
