"""Repository connection, indexing, and code search API."""
import asyncio
import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from backend.models.engine import get_db
from backend.models.database import Repository, CodeSymbol, uid
from backend.services.code_index_service import index_repository, search_symbols, answer_code_question

router = APIRouter(prefix="/repositories", tags=["code_index"])


class RepoCreate(BaseModel):
    name: str
    local_path: str
    branch: str = "main"
    include_patterns: List[str] = ["**/*.py", "**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
    exclude_patterns: List[str] = ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**"]


class RepoUpdate(BaseModel):
    name: Optional[str] = None
    branch: Optional[str] = None
    include_patterns: Optional[List[str]] = None
    exclude_patterns: Optional[List[str]] = None


def _repo_out(r: Repository) -> dict:
    return {
        "id": r.id, "project_id": r.project_id, "name": r.name,
        "local_path": r.local_path, "branch": r.branch, "status": r.status,
        "symbol_count": r.symbol_count, "last_indexed_at": r.last_indexed_at,
        "error_message": r.error_message, "created_at": r.created_at,
        "include_patterns": json.loads(r.include_patterns_json or "[]"),
        "exclude_patterns": json.loads(r.exclude_patterns_json or "[]"),
    }


@router.get("/project/{project_id}", response_model=list)
async def list_repos(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Repository).where(Repository.project_id == project_id))
    return [_repo_out(r) for r in result.scalars().all()]


@router.post("/project/{project_id}")
async def create_repo(project_id: str, body: RepoCreate, db: AsyncSession = Depends(get_db)):
    repo = Repository(
        id=uid(), project_id=project_id, name=body.name, local_path=body.local_path,
        branch=body.branch,
        include_patterns_json=json.dumps(body.include_patterns),
        exclude_patterns_json=json.dumps(body.exclude_patterns),
    )
    db.add(repo)
    await db.commit()
    await db.refresh(repo)
    return _repo_out(repo)


@router.patch("/{repo_id}")
async def update_repo(repo_id: str, body: RepoUpdate, db: AsyncSession = Depends(get_db)):
    repo = await db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if body.name is not None: repo.name = body.name
    if body.branch is not None: repo.branch = body.branch
    if body.include_patterns is not None: repo.include_patterns_json = json.dumps(body.include_patterns)
    if body.exclude_patterns is not None: repo.exclude_patterns_json = json.dumps(body.exclude_patterns)
    await db.commit()
    return _repo_out(repo)


@router.delete("/{repo_id}")
async def delete_repo(repo_id: str, db: AsyncSession = Depends(get_db)):
    repo = await db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    await db.delete(repo)
    await db.commit()
    return {"deleted": repo_id}


@router.post("/{repo_id}/index")
async def trigger_index(repo_id: str, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    repo = await db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if repo.status == "indexing":
        return {"status": "already indexing"}
    background_tasks.add_task(_run_index, repo_id)
    return {"status": "indexing started", "repo_id": repo_id}


async def _run_index(repo_id: str):
    from backend.models.engine import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        await index_repository(repo_id, db)


@router.get("/{repo_id}/status")
async def get_status(repo_id: str, db: AsyncSession = Depends(get_db)):
    repo = await db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return _repo_out(repo)


@router.get("/{repo_id}/search")
async def search_code(
    repo_id: str,
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    repo = await db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    results = await search_symbols(q, repo_id, db, limit=limit)
    return {"query": q, "repo_id": repo_id, "results": results}


@router.post("/{repo_id}/ask")
async def ask_code(repo_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    question = body.get("question", "")
    if not question:
        raise HTTPException(status_code=400, detail="question is required")
    return await answer_code_question(question, repo_id, db)
