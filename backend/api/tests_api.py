"""Test Cases CRUD router."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.engine import get_db
from backend.models.database import TestCase, Requirement, TestStatus, uid
from backend.models.schemas import TestCaseCreate, TestCaseResponse
from backend.services.audit_service import audit_service

router = APIRouter(prefix="/requirements/{requirement_id}/tests", tags=["tests"])

TEST_VALID_TRANSITIONS = {
    "pending": ["passed", "failed", "skipped"],
    "passed": ["failed", "pending"],
    "failed": ["passed", "pending", "skipped"],
    "skipped": ["pending"],
}


@router.post("", response_model=TestCaseResponse)
async def create_test_case(requirement_id: str, body: TestCaseCreate, db: AsyncSession = Depends(get_db)):
    req = await db.get(Requirement, requirement_id)
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    tc = TestCase(
        id=uid(),
        requirement_id=requirement_id,
        name=body.name,
        description=body.description,
        test_type=body.test_type,
    )
    db.add(tc)
    await db.commit()
    await db.refresh(tc)
    await audit_service.log_create(db, "test_case", tc.id, {"name": tc.name, "requirement_id": requirement_id})
    return tc


@router.get("", response_model=list[TestCaseResponse])
async def list_test_cases(requirement_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TestCase).where(TestCase.requirement_id == requirement_id).order_by(TestCase.created_at.desc())
    )
    return result.scalars().all()


@router.patch("/{tc_id}/status")
async def update_test_status(requirement_id: str, tc_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    tc = await db.get(TestCase, tc_id)
    if not tc or tc.requirement_id != requirement_id:
        raise HTTPException(status_code=404, detail="Test case not found")
    new_status = body.get("status", "")
    old_status = tc.status.value if hasattr(tc.status, "value") else tc.status
    allowed = TEST_VALID_TRANSITIONS.get(old_status, [])
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail=f"Cannot transition from '{old_status}' to '{new_status}'. Allowed: {allowed}")
    tc.status = TestStatus(new_status)
    if "result" in body:
        tc.result = body["result"]
    await db.commit()
    await db.refresh(tc)
    await audit_service.log_status_change(db, "test_case", tc_id, old_status, new_status)
    return {"id": tc.id, "status": tc.status.value}
