"""Pydantic schemas for API request/response."""
import json
from pydantic import BaseModel, Field, model_validator
from datetime import datetime
from typing import Optional

_MAX_TITLE = 500
_MAX_DESC = 8_000
_MAX_FEEDBACK = 32_000


def _safe_json(raw, default):
    """Parse a JSON string safely, returning default on failure."""
    if raw is None:
        return default
    if not isinstance(raw, str):
        # Already parsed (e.g. dict/list passed directly)
        return raw
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return default


def _orm_to_dict(data):
    """Convert SQLAlchemy ORM object or mapping to plain dict."""
    if hasattr(data, "__table__"):
        return {c.key: getattr(data, c.key) for c in data.__table__.columns}
    return dict(data)


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
    product_overview: dict = {}
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def parse_json_fields(cls, data):
        d = _orm_to_dict(data)
        raw = d.pop("product_overview_json", None)
        if "product_overview" not in d or d.get("product_overview") is None:
            d["product_overview"] = _safe_json(raw, {})
        return d


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
    acceptance_criteria: list[str] = []
    ears_warnings: list[str] = []
    ai_generated: bool
    created_by: str
    created_at: str

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def parse_json_fields(cls, data):
        d = _orm_to_dict(data)
        ac_raw = d.pop("acceptance_criteria_json", None)
        ew_raw = d.pop("ears_warnings_json", None)
        if "acceptance_criteria" not in d or d.get("acceptance_criteria") is None:
            d["acceptance_criteria"] = _safe_json(ac_raw, [])
        if "ears_warnings" not in d or d.get("ears_warnings") is None:
            d["ears_warnings"] = _safe_json(ew_raw, [])
        # Normalise status enum to string
        if hasattr(d.get("status"), "value"):
            d["status"] = d["status"].value
        return d


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
    parsed_nodes: list[dict] = []
    decisions: list[dict] = []
    components: list[dict] = []
    constraints: list[str] = []
    version: int
    created_at: str

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def parse_json_fields(cls, data):
        d = _orm_to_dict(data)
        for json_col, target, default in [
            ("parsed_nodes_json", "parsed_nodes", []),
            ("decisions_json", "decisions", []),
            ("components_json", "components", []),
            ("constraints_json", "constraints", []),
        ]:
            raw = d.pop(json_col, None)
            if target not in d or d.get(target) is None:
                d[target] = _safe_json(raw, default)
        return d


class WorkOrderCreate(BaseModel):
    title: str = Field(..., max_length=_MAX_TITLE)
    description: str = Field("", max_length=_MAX_DESC)
    requirement_ids: list[str] = []
    context: dict = {}

class WorkOrderResponse(BaseModel):
    id: str
    blueprint_id: str
    requirement_ids: list[str] = []
    title: str
    description: str
    context: dict = {}
    status: str
    assigned_to: str
    ai_output: str
    created_at: str

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def parse_json_fields(cls, data):
        d = _orm_to_dict(data)
        ri_raw = d.pop("requirement_ids_json", None)
        ctx_raw = d.pop("context_json", None)
        if "requirement_ids" not in d or d.get("requirement_ids") is None:
            d["requirement_ids"] = _safe_json(ri_raw, [])
        if "context" not in d or d.get("context") is None:
            d["context"] = _safe_json(ctx_raw, {})
        if hasattr(d.get("status"), "value"):
            d["status"] = d["status"].value
        return d


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
    evidence: list[dict] = []
    created_at: str

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def parse_json_fields(cls, data):
        d = _orm_to_dict(data)
        raw = d.pop("evidence_json", None)
        if "evidence" not in d or d.get("evidence") is None:
            parsed = _safe_json(raw, [])
            # evidence_json is sometimes stored as a dict (legacy); normalise
            d["evidence"] = parsed if isinstance(parsed, list) else [parsed] if parsed else []
        if hasattr(d.get("status"), "value"):
            d["status"] = d["status"].value
        return d


class FeedbackCreate(BaseModel):
    source: str = Field("manual", max_length=100)
    raw_text: str = Field(..., max_length=_MAX_FEEDBACK)

class FeedbackResponse(BaseModel):
    id: str
    project_id: str
    source: str
    raw_text: str
    parsed_tasks: list[dict] = []
    status: str
    linked_work_order_id: Optional[str]
    created_at: str

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def parse_json_fields(cls, data):
        d = _orm_to_dict(data)
        raw = d.pop("parsed_tasks_json", None)
        if "parsed_tasks" not in d or d.get("parsed_tasks") is None:
            d["parsed_tasks"] = _safe_json(raw, [])
        return d


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
    model_config = {"from_attributes": True}


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
