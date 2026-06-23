"""Pydantic schemas for API request/response."""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    template: str = ""

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    template: str
    created_at: str
    updated_at: str
    class Config: from_attributes = True


class RequirementCreate(BaseModel):
    title: str
    description: str = ""
    priority: int = 3
    acceptance_criteria: list[str] = []
    ai_generated: bool = False

class RequirementUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[int] = None
    status: Optional[str] = None
    acceptance_criteria: Optional[list[str]] = None

class RequirementResponse(BaseModel):
    id: str
    project_id: str
    title: str
    description: str
    priority: int
    status: str
    acceptance_criteria_json: str
    ai_generated: bool
    created_by: str
    created_at: str
    class Config: from_attributes = True


class BlueprintCreate(BaseModel):
    name: str
    description: str = ""
    decisions: list[dict] = []
    components: list[dict] = []
    constraints: list[str] = []

class BlueprintResponse(BaseModel):
    id: str
    project_id: str
    name: str
    description: str
    decisions_json: str
    components_json: str
    constraints_json: str
    version: int
    created_at: str
    class Config: from_attributes = True


class WorkOrderCreate(BaseModel):
    title: str
    description: str = ""
    requirement_ids: list[str] = []
    context: dict = {}

class WorkOrderResponse(BaseModel):
    id: str
    blueprint_id: str
    requirement_ids_json: str
    title: str
    description: str
    context_json: str
    status: str
    assigned_to: str
    ai_output: str
    created_at: str
    class Config: from_attributes = True


class TestCaseCreate(BaseModel):
    name: str
    description: str = ""
    test_type: str = "unit"

class TestCaseResponse(BaseModel):
    id: str
    requirement_id: str
    work_order_id: Optional[str]
    name: str
    description: str
    test_type: str
    status: str
    result: str
    evidence_json: str
    created_at: str
    class Config: from_attributes = True


class FeedbackCreate(BaseModel):
    source: str = "manual"
    raw_text: str

class FeedbackResponse(BaseModel):
    id: str
    project_id: str
    source: str
    raw_text: str
    parsed_tasks_json: str
    status: str
    linked_work_order_id: Optional[str]
    created_at: str
    class Config: from_attributes = True


class AuditLogResponse(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    action: str
    actor: str
    before_json: str
    after_json: str
    rationale: str
    timestamp: str
    class Config: from_attributes = True


# AI request schemas
class GenerateRequirementsRequest(BaseModel):
    project_id: str
    project_description: str

class GenerateBlueprintRequest(BaseModel):
    project_id: str
    project_description: str

class GenerateWorkOrdersRequest(BaseModel):
    blueprint_id: str

class GenerateTestsRequest(BaseModel):
    requirement_id: str

class ParseFeedbackRequest(BaseModel):
    project_id: str
    feedback_text: str
    source: str = "manual"

class SwitchProviderRequest(BaseModel):
    provider: str
    model: str = ""
    api_key: str = ""

class PullModelRequest(BaseModel):
    name: str
