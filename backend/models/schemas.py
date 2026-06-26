"""Pydantic schemas for API request/response."""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

_MAX_TITLE = 500
_MAX_DESC = 8_000
_MAX_FEEDBACK = 32_000


class ProjectCreate(BaseModel):
    name: str = Field(..., max_length=_MAX_TITLE)
    description: str = Field("", max_length=_MAX_DESC)
    template: str = Field("", max_length=100)

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=_MAX_TITLE)
    description: Optional[str] = Field(None, max_length=_MAX_DESC)

class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    template: str
    product_overview_json: str = "{}"
    created_at: str
    updated_at: str
    class Config: from_attributes = True


class RequirementCreate(BaseModel):
    title: str = Field(..., max_length=_MAX_TITLE)
    description: str = Field("", max_length=_MAX_DESC)
    priority: int = Field(3, ge=1, le=5)
    acceptance_criteria: list[str] = []
    ai_generated: bool = False

class RequirementUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=_MAX_TITLE)
    description: Optional[str] = Field(None, max_length=_MAX_DESC)
    priority: Optional[int] = Field(None, ge=1, le=5)
    status: Optional[str] = Field(None, max_length=50)
    acceptance_criteria: Optional[list[str]] = None

class RequirementResponse(BaseModel):
    id: str
    project_id: str
    req_id: str = ""
    title: str
    description: str
    priority: int
    status: str
    acceptance_criteria_json: str
    ears_warnings_json: str = "[]"
    ai_generated: bool
    created_by: str
    created_at: str
    class Config: from_attributes = True


class BlueprintCreate(BaseModel):
    name: str = Field(..., max_length=_MAX_TITLE)
    description: str = Field("", max_length=_MAX_DESC)
    dsl_content: str = Field("", max_length=50_000)
    decisions: list[dict] = []
    components: list[dict] = []
    constraints: list[str] = []

class BlueprintResponse(BaseModel):
    id: str
    project_id: str
    bp_id: str = ""
    name: str
    description: str
    dsl_content: str = ""
    parsed_nodes_json: str = "[]"
    decisions_json: str
    components_json: str
    constraints_json: str
    version: int
    created_at: str
    class Config: from_attributes = True


class WorkOrderCreate(BaseModel):
    title: str = Field(..., max_length=_MAX_TITLE)
    description: str = Field("", max_length=_MAX_DESC)
    requirement_ids: list[str] = []
    context: dict = {}

class WorkOrderResponse(BaseModel):
    id: str
    blueprint_id: str
    wo_id: str = ""
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
    name: str = Field(..., max_length=_MAX_TITLE)
    description: str = Field("", max_length=_MAX_DESC)
    test_type: str = Field("unit", max_length=50)

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
    source: str = Field("manual", max_length=100)
    raw_text: str = Field(..., max_length=_MAX_FEEDBACK)

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
    project_id: str = Field(..., max_length=50)
    project_description: str = Field(..., max_length=_MAX_DESC)
    codebase_path: Optional[str] = Field(None, max_length=512)

class GenerateBlueprintRequest(BaseModel):
    project_id: str = Field(..., max_length=50)
    project_description: str = Field(..., max_length=_MAX_DESC)
    codebase_path: Optional[str] = Field(None, max_length=512)

class GenerateWorkOrdersRequest(BaseModel):
    blueprint_id: str = Field(..., max_length=50)
    codebase_path: Optional[str] = Field(None, max_length=512)

class GenerateTestsRequest(BaseModel):
    requirement_id: str = Field(..., max_length=50)

class ParseFeedbackRequest(BaseModel):
    project_id: str = Field(..., max_length=50)
    feedback_text: str = Field(..., max_length=_MAX_FEEDBACK)
    source: str = Field("manual", max_length=100)
    codebase_path: Optional[str] = Field(None, max_length=512)

class ProductOverviewUpdate(BaseModel):
    business_problem: str = Field("", max_length=_MAX_DESC)
    current_state: str = Field("", max_length=_MAX_DESC)
    personas: list[dict] = []      # [{ name, role, goals, pain_points }]
    product_description: str = Field("", max_length=_MAX_DESC)
    success_metrics: list[str] = []
    technical_requirements: list[str] = []

class GenerateProductOverviewRequest(BaseModel):
    project_id: str = Field(..., max_length=50)
    interview_answers: dict = {}   # keys map to ProductOverviewUpdate fields

class SwitchProviderRequest(BaseModel):
    provider: str = Field(..., max_length=50)
    model: str = Field("", max_length=100)
    api_key: str = Field("", max_length=500)

class PullModelRequest(BaseModel):
    name: str = Field(..., max_length=100)
