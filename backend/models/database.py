"""All SQLAlchemy models for 1024 Studio."""
import enum, uuid, json, os
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, ForeignKey, Enum as SAEnum, Index
from sqlalchemy.orm import relationship
from backend.models.engine import Base


def uid() -> str:
    return uuid.uuid4().hex[:12]

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def current_user() -> str:
    """Return the OS username for local desktop attribution."""
    return os.environ.get("USER", os.environ.get("USERNAME", "local"))


class ReqStatus(str, enum.Enum):
    DRAFT = "draft"
    REVIEW = "review"
    APPROVED = "approved"
    IMPLEMENTED = "implemented"

class WOStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"

class TestStatus(str, enum.Enum):
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"


class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True, default=uid)
    name = Column(String(500), nullable=False)
    description = Column(Text, default="")
    template = Column(String(100), default="")
    settings_json = Column(Text, default="{}")
    product_overview_json = Column(Text, default="{}")  # business_problem, personas, success_metrics, etc.
    req_counter = Column(Integer, default=0)             # monotonic counter for REQ IDs
    bp_counter = Column(Integer, default=0)              # monotonic counter for BLU IDs
    created_at = Column(String, default=now_iso)
    updated_at = Column(String, default=now_iso, onupdate=now_iso)
    requirements = relationship("Requirement", cascade="all,delete-orphan", back_populates="project")
    blueprints = relationship("Blueprint", cascade="all,delete-orphan", back_populates="project")
    feedbacks = relationship("Feedback", cascade="all,delete-orphan", back_populates="project")


class Requirement(Base):
    __tablename__ = "requirements"
    __table_args__ = (
        Index("ix_requirements_project_id", "project_id"),
        Index("ix_requirements_status", "status"),
        Index("ix_requirements_created_at", "created_at"),
        Index("ix_requirements_req_id", "req_id"),
    )
    id = Column(String, primary_key=True, default=uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    req_id = Column(String(30), default="")   # e.g. REQ-AUTH-001
    title = Column(String(1000), nullable=False)
    description = Column(Text, default="")
    priority = Column(Integer, default=3)
    status = Column(SAEnum(ReqStatus), default=ReqStatus.DRAFT)
    acceptance_criteria_json = Column(Text, default="[]")
    ears_warnings_json = Column(Text, default="[]")  # list of AC indices failing EARS format
    ai_generated = Column(Boolean, default=False)
    created_by = Column(String(100), default="user")
    created_at = Column(String, default=now_iso)
    project = relationship("Project", back_populates="requirements")
    test_cases = relationship("TestCase", cascade="all,delete-orphan", back_populates="requirement")


class Blueprint(Base):
    __tablename__ = "blueprints"
    __table_args__ = (
        Index("ix_blueprints_project_id", "project_id"),
    )
    id = Column(String, primary_key=True, default=uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    bp_id = Column(String(30), default="")   # e.g. BLU-AUTH-001
    name = Column(String(500), nullable=False)
    description = Column(Text, default="")
    dsl_content = Column(Text, default="")   # raw DSL Markdown text
    parsed_nodes_json = Column(Text, default="[]")  # extracted components/models/ADRs
    decisions_json = Column(Text, default="[]")
    components_json = Column(Text, default="[]")
    constraints_json = Column(Text, default="[]")
    version = Column(Integer, default=1)
    wo_counter = Column(Integer, default=0)              # monotonic counter for WO IDs
    created_at = Column(String, default=now_iso)
    project = relationship("Project", back_populates="blueprints")
    work_orders = relationship("WorkOrder", cascade="all,delete-orphan", back_populates="blueprint")


class WorkOrder(Base):
    __tablename__ = "work_orders"
    __table_args__ = (
        Index("ix_work_orders_blueprint_id", "blueprint_id"),
        Index("ix_work_orders_status", "status"),
    )
    id = Column(String, primary_key=True, default=uid)
    blueprint_id = Column(String, ForeignKey("blueprints.id", ondelete="CASCADE"), nullable=False)
    wo_id = Column(String(30), default="")    # e.g. WO-AUTH-001
    requirement_ids_json = Column(Text, default="[]")
    title = Column(String(1000), nullable=False)
    description = Column(Text, default="")
    context_json = Column(Text, default="{}")
    status = Column(SAEnum(WOStatus), default=WOStatus.PENDING)
    assigned_to = Column(String(100), default="")
    ai_output = Column(Text, default="")
    git_commit = Column(String(100), default="")
    created_at = Column(String, default=now_iso)
    blueprint = relationship("Blueprint", back_populates="work_orders")
    test_cases = relationship("TestCase", cascade="all,delete-orphan", back_populates="work_order")


class TestCase(Base):
    __tablename__ = "test_cases"
    __table_args__ = (
        Index("ix_test_cases_requirement_id", "requirement_id"),
        Index("ix_test_cases_status", "status"),
    )
    id = Column(String, primary_key=True, default=uid)
    requirement_id = Column(String, ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False)
    work_order_id = Column(String, ForeignKey("work_orders.id"), nullable=True)
    name = Column(String(1000), nullable=False)
    description = Column(Text, default="")
    test_type = Column(String(50), default="unit")
    status = Column(SAEnum(TestStatus), default=TestStatus.PENDING)
    result = Column(Text, default="")
    evidence_json = Column(Text, default="{}")
    created_at = Column(String, default=now_iso)
    requirement = relationship("Requirement", back_populates="test_cases")
    work_order = relationship("WorkOrder", back_populates="test_cases")


class Feedback(Base):
    __tablename__ = "feedbacks"
    __table_args__ = (
        Index("ix_feedbacks_project_id", "project_id"),
        Index("ix_feedbacks_created_at", "created_at"),
    )
    id = Column(String, primary_key=True, default=uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    source = Column(String(100), default="manual")
    raw_text = Column(Text, nullable=False)
    parsed_tasks_json = Column(Text, default="[]")
    status = Column(String(50), default="new")
    linked_work_order_id = Column(String, nullable=True)
    created_at = Column(String, default=now_iso)
    project = relationship("Project", back_populates="feedbacks")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_entity_type_id", "entity_type", "entity_id"),
        Index("ix_audit_logs_timestamp", "timestamp"),
    )
    id = Column(String, primary_key=True, default=uid)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String, nullable=False)
    action = Column(String(50), nullable=False)
    actor = Column(String(100), default="user")
    before_json = Column(Text, default="{}")
    after_json = Column(Text, default="{}")
    rationale = Column(Text, default="")
    timestamp = Column(String, default=now_iso)


class KGNode(Base):
    __tablename__ = "kg_nodes"
    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"))
    node_type = Column(String(50), nullable=False)
    title = Column(String(1000), nullable=False)
    content = Column(Text, default="")
    metadata_json = Column(Text, default="{}")
    created_at = Column(String, default=now_iso)


class KGEdge(Base):
    __tablename__ = "kg_edges"
    source_id = Column(String, ForeignKey("kg_nodes.id", ondelete="CASCADE"), primary_key=True)
    target_id = Column(String, ForeignKey("kg_nodes.id", ondelete="CASCADE"), primary_key=True)
    relationship = Column(String(100), primary_key=True)
    weight = Column(Float, default=1.0)
    metadata_json = Column(Text, default="{}")


class Template(Base):
    __tablename__ = "templates"
    id = Column(String, primary_key=True, default=uid)
    name = Column(String(500), nullable=False)
    description = Column(Text, default="")
    category = Column(String(100), default="general")
    requirements_json = Column(Text, default="[]")
    blueprint_json = Column(Text, default="{}")
    created_at = Column(String, default=now_iso)


class Setting(Base):
    __tablename__ = "settings"
    key = Column(String(200), primary_key=True)
    value = Column(Text, nullable=False)


class ReferralCode(Base):
    __tablename__ = "referral_codes"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    url = Column(String(500), nullable=False)
    uses = Column(Integer, default=0)
    created_at = Column(String, default=now_iso)


class UserCredits(Base):
    __tablename__ = "user_credits"
    user_id = Column(String, primary_key=True)
    balance = Column(Integer, default=0)
    lifetime_earned = Column(Integer, default=0)
    lifetime_spent = Column(Integer, default=0)
    referral_tier = Column(String(50), default="seed")
    referral_count = Column(Integer, default=0)
    updated_at = Column(String, default=now_iso)


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"
    id = Column(String, primary_key=True, default=uid)
    user_id = Column(String, nullable=False)
    amount = Column(Integer, nullable=False)
    reason = Column(String(200), nullable=False)
    reference_id = Column(String, default="")
    created_at = Column(String, default=now_iso)


class DocumentVersion(Base):
    """Immutable content snapshot for requirements and blueprints."""
    __tablename__ = "document_versions"
    __table_args__ = (
        Index("ix_doc_versions_entity", "entity_type", "entity_id"),
        Index("ix_doc_versions_created_at", "created_at"),
    )
    id = Column(String, primary_key=True, default=uid)
    entity_type = Column(String(50), nullable=False)   # "requirement" | "blueprint"
    entity_id = Column(String, nullable=False)
    version_number = Column(Integer, nullable=False)
    content_json = Column(Text, nullable=False, default="{}")
    summary = Column(String(500), default="")           # short change description
    created_by = Column(String(100), default="user")
    created_at = Column(String, default=now_iso)


class Plugin(Base):
    """Persisted plugin registry — both built-in and user-installed plugins."""
    __tablename__ = "plugins"
    id = Column(String(100), primary_key=True)
    name = Column(String(200), default="")
    description = Column(String(2000), default="")
    version = Column(String(50), default="1.0.0")
    author = Column(String(200), default="")
    endpoint = Column(String(500), nullable=True)
    category = Column(String(100), default="custom")
    enabled = Column(Boolean, default=True)
    builtin = Column(Boolean, default=False)
    created_at = Column(String(30), default=now_iso)


class TokenUsageLog(Base):
    """One row per LLM API call (or cache hit)."""
    __tablename__ = "token_usage_logs"
    __table_args__ = (
        Index("ix_token_usage_timestamp", "timestamp"),
        Index("ix_token_usage_session", "session_id"),
        Index("ix_token_usage_agent", "agent_type"),
    )
    id              = Column(String, primary_key=True, default=uid)
    session_id      = Column(String(100), nullable=False, default="global")
    provider        = Column(String(50), nullable=False, default="")
    model           = Column(String(100), nullable=False, default="")
    agent_type      = Column(String(50), nullable=False, default="default")
    prompt_tokens   = Column(Integer, nullable=False, default=0)
    completion_tokens = Column(Integer, nullable=False, default=0)
    total_tokens    = Column(Integer, nullable=False, default=0)
    tokens_saved    = Column(Integer, nullable=False, default=0)   # saved by compression
    cache_hit       = Column(Boolean, nullable=False, default=False)
    timestamp       = Column(String, nullable=False, default=now_iso)


class Repository(Base):
    """A local code repository connected to a project for indexing."""
    __tablename__ = "repositories"
    __table_args__ = (
        Index("ix_repositories_project_id", "project_id"),
    )
    id = Column(String, primary_key=True, default=uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(500), nullable=False)
    local_path = Column(String(2000), nullable=False)
    branch = Column(String(200), default="main")
    include_patterns_json = Column(Text, default='["**/*.py","**/*.ts","**/*.tsx","**/*.js","**/*.jsx"]')
    exclude_patterns_json = Column(Text, default='["**/node_modules/**","**/.git/**","**/dist/**","**/build/**"]')
    status = Column(String(50), default="idle")   # idle | indexing | ready | error
    last_indexed_at = Column(String, nullable=True)
    symbol_count = Column(Integer, default=0)
    error_message = Column(Text, default="")
    created_at = Column(String, default=now_iso)
    project = relationship("Project", foreign_keys=[project_id])


class CodeSymbol(Base):
    """A single extracted symbol (function, class, method, variable) from an indexed file."""
    __tablename__ = "code_symbols"
    __table_args__ = (
        Index("ix_code_symbols_repo_id", "repo_id"),
        Index("ix_code_symbols_file", "repo_id", "file_path"),
        Index("ix_code_symbols_name", "name"),
    )
    id = Column(String, primary_key=True, default=uid)
    repo_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(2000), nullable=False)
    symbol_type = Column(String(50), nullable=False)   # "class" | "function" | "method" | "variable" | "interface"
    name = Column(String(500), nullable=False)
    qualified_name = Column(String(1000), default="")
    line_start = Column(Integer, default=0)
    line_end = Column(Integer, default=0)
    signature = Column(Text, default="")
    docstring = Column(Text, default="")
    body_preview = Column(Text, default="")
    language = Column(String(50), default="")
    embedding_json = Column(Text, nullable=True)
    created_at = Column(String, default=now_iso)


class DriftAlert(Base):
    """Drift alert: a mismatch between a blueprint reference and indexed code."""
    __tablename__ = "drift_alerts"
    __table_args__ = (
        Index("ix_drift_alerts_project_id", "project_id"),
        Index("ix_drift_alerts_status", "status"),
    )
    id = Column(String, primary_key=True, default=uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    blueprint_id = Column(String, ForeignKey("blueprints.id", ondelete="CASCADE"), nullable=False)
    repo_id = Column(String, nullable=True)
    alert_type = Column(String(100), nullable=False)   # "missing_symbol" | "signature_mismatch" | "undocumented_symbol"
    severity = Column(String(20), default="warning")   # "info" | "warning" | "critical"
    title = Column(String(500), nullable=False)
    description = Column(Text, default="")
    blueprint_reference = Column(String(500), default="")
    code_reality = Column(String(500), default="")
    status = Column(String(50), default="open")        # "open" | "acknowledged" | "resolved"
    resolution_note = Column(Text, default="")
    detected_at = Column(String, default=now_iso)
    resolved_at = Column(String, nullable=True)
    project = relationship("Project", foreign_keys=[project_id])
    blueprint = relationship("Blueprint", foreign_keys=[blueprint_id])


class SimulatorRun(Base):
    """A crawl session that explores a live web app to build a spatial map."""
    __tablename__ = "simulator_runs"
    __table_args__ = (
        Index("ix_simulator_runs_project_id", "project_id"),
    )
    id = Column(String, primary_key=True, default=uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    target_url = Column(String(2000), nullable=False)
    status = Column(String(50), default="pending")   # pending | running | done | error
    screen_count = Column(Integer, default=0)
    max_depth = Column(Integer, default=2)
    error_message = Column(Text, default="")
    started_at = Column(String, nullable=True)
    completed_at = Column(String, nullable=True)
    created_at = Column(String, default=now_iso)
    project = relationship("Project", foreign_keys=[project_id])
    screens = relationship("SimulatorScreen", cascade="all,delete-orphan", back_populates="run")


class SimulatorScreen(Base):
    """A single captured screen/route from a simulator crawl."""
    __tablename__ = "simulator_screens"
    __table_args__ = (
        Index("ix_simulator_screens_run_id", "run_id"),
    )
    id = Column(String, primary_key=True, default=uid)
    run_id = Column(String, ForeignKey("simulator_runs.id", ondelete="CASCADE"), nullable=False)
    route = Column(String(2000), nullable=False)
    title = Column(String(500), default="")
    screenshot_b64 = Column(Text, nullable=True)
    placeholder_svg = Column(Text, nullable=True)
    selector_count = Column(Integer, default=0)
    links_json = Column(Text, default="[]")
    depth = Column(Integer, default=0)
    crawled_at = Column(String, default=now_iso)
    run = relationship("SimulatorRun", back_populates="screens")


class QAFlow(Base):
    """A generated Playwright test suite for a blueprint/requirement set."""
    __tablename__ = "qa_flows"
    __table_args__ = (
        Index("ix_qa_flows_project_id", "project_id"),
        Index("ix_qa_flows_blueprint_id", "blueprint_id"),
    )
    id = Column(String, primary_key=True, default=uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    blueprint_id = Column(String, ForeignKey("blueprints.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(500), nullable=False)
    description = Column(Text, default="")
    target_url = Column(String(2000), default="")
    test_code = Column(Text, default="")
    status = Column(String(50), default="draft")   # draft | ready | running | passed | failed
    last_run_at = Column(String, nullable=True)
    last_run_output = Column(Text, default="")
    last_run_passed = Column(Integer, default=0)
    last_run_failed = Column(Integer, default=0)
    ai_generated = Column(Boolean, default=False)
    created_at = Column(String, default=now_iso)
    project = relationship("Project", foreign_keys=[project_id])


class FrictionEvent(Base):
    """A captured user friction event from the embeddable support widget."""
    __tablename__ = "friction_events"
    __table_args__ = (
        Index("ix_friction_events_project_id", "project_id"),
        Index("ix_friction_events_status", "status"),
    )
    id = Column(String, primary_key=True, default=uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(String(100), default="")
    event_type = Column(String(100), nullable=False)   # "rage_click" | "error" | "long_pause" | "repeated_action" | "feedback"
    severity = Column(String(20), default="info")      # "info" | "warning" | "critical"
    page_url = Column(String(2000), default="")
    element_selector = Column(String(500), default="")
    message = Column(Text, default="")
    metadata_json = Column(Text, default="{}")
    status = Column(String(50), default="open")        # "open" | "promoted" | "dismissed"
    promoted_wo_id = Column(String, nullable=True)
    created_at = Column(String, default=now_iso)
    project = relationship("Project", foreign_keys=[project_id])


# ── Section 16 Models ─────────────────────────────────────────────────────────

class AgentInstruction(Base):
    """Editable system instructions per module/project for AI agents."""
    __tablename__ = "agent_instructions"
    __table_args__ = (
        Index("ix_agent_instructions_project_id", "project_id"),
    )
    id = Column(String, primary_key=True, default=uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    module = Column(String(100), nullable=False)
    instructions = Column(Text, default="")
    active = Column(Boolean, default=True)
    created_at = Column(String, default=now_iso)
    updated_at = Column(String, default=now_iso)
    project = relationship("Project", foreign_keys=[project_id])


class CustomDocTemplate(Base):
    """User-editable document templates (beyond the seeded presets)."""
    __tablename__ = "custom_doc_templates"
    __table_args__ = (
        Index("ix_custom_doc_templates_project_id", "project_id"),
    )
    id = Column(String, primary_key=True, default=uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(500), nullable=False)
    description = Column(Text, default="")
    template_type = Column(String(100), default="requirement")
    body = Column(Text, default="")
    variables_json = Column(Text, default="[]")
    is_default = Column(Boolean, default=False)
    created_at = Column(String, default=now_iso)


class WOScopeStrategy(Base):
    """Work order decomposition strategies."""
    __tablename__ = "wo_scope_strategies"
    id = Column(String, primary_key=True, default=uid)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    prompt_addendum = Column(Text, default="")
    is_builtin = Column(Boolean, default=False)
    created_at = Column(String, default=now_iso)


class Artifact(Base):
    """An uploaded file used as agent context."""
    __tablename__ = "artifacts"
    __table_args__ = (
        Index("ix_artifacts_project_id", "project_id"),
    )
    id = Column(String, primary_key=True, default=uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(500), nullable=False)
    content_type = Column(String(200), default="application/octet-stream")
    size_bytes = Column(Integer, default=0)
    storage_path = Column(String(2000), default="")
    description = Column(Text, default="")
    text_content = Column(Text, default="")
    uploaded_at = Column(String, default=now_iso)
    project = relationship("Project", foreign_keys=[project_id])


class AgentHook(Base):
    """An event-triggered automation hook."""
    __tablename__ = "agent_hooks"
    __table_args__ = (
        Index("ix_agent_hooks_project_id", "project_id"),
    )
    id = Column(String, primary_key=True, default=uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    event_type = Column(String(100), nullable=False)
    action = Column(String(100), nullable=False)
    config_json = Column(Text, default="{}")
    enabled = Column(Boolean, default=True)
    last_triggered_at = Column(String, nullable=True)
    last_result = Column(Text, default="")
    created_at = Column(String, default=now_iso)
    project = relationship("Project", foreign_keys=[project_id])


class Notification(Base):
    """A notification for the notification center."""
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_project_id", "project_id"),
        Index("ix_notifications_read", "read"),
    )
    id = Column(String, primary_key=True, default=uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(500), nullable=False)
    body = Column(Text, default="")
    notification_type = Column(String(100), default="info")
    entity_type = Column(String(50), default="")
    entity_id = Column(String, default="")
    read = Column(Boolean, default=False)
    created_at = Column(String, default=now_iso)


class FeedbackTheme(Base):
    """A theme grouping multiple feedback items."""
    __tablename__ = "feedback_themes"
    __table_args__ = (
        Index("ix_feedback_themes_project_id", "project_id"),
    )
    id = Column(String, primary_key=True, default=uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(500), nullable=False)
    description = Column(Text, default="")
    feedback_ids_json = Column(Text, default="[]")
    ai_generated = Column(Boolean, default=False)
    color = Column(String(20), default="#0071E3")
    created_at = Column(String, default=now_iso)
    project = relationship("Project", foreign_keys=[project_id])


class ExternalAPIKey(Base):
    """User-managed external API key for headless automation."""
    __tablename__ = "external_api_keys"
    id = Column(String, primary_key=True, default=uid)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    key_hash = Column(String(200), nullable=False)
    key_prefix = Column(String(20), default="")
    scopes_json = Column(Text, default='["read"]')
    last_used_at = Column(String, nullable=True)
    expires_at = Column(String, nullable=True)
    enabled = Column(Boolean, default=True)
    created_at = Column(String, default=now_iso)


class CommentThread(Base):
    """An inline comment thread attached to a document element."""
    __tablename__ = "comment_threads"
    __table_args__ = (
        Index("ix_comment_threads_entity", "entity_type", "entity_id"),
    )
    id = Column(String, primary_key=True, default=uid)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String, nullable=False)
    field = Column(String(100), default="")
    anchor_text = Column(Text, default="")
    status = Column(String(20), default="open")
    created_by = Column(String(100), default="user")
    resolved_by = Column(String(100), nullable=True)
    created_at = Column(String, default=now_iso)
    resolved_at = Column(String, nullable=True)
    comments = relationship("Comment", cascade="all,delete-orphan", back_populates="thread")


class Comment(Base):
    """A single comment in a thread."""
    __tablename__ = "comments"
    __table_args__ = (
        Index("ix_comments_thread_id", "thread_id"),
    )
    id = Column(String, primary_key=True, default=uid)
    thread_id = Column(String, ForeignKey("comment_threads.id", ondelete="CASCADE"), nullable=False)
    body = Column(Text, nullable=False)
    author = Column(String(100), default="user")
    created_at = Column(String, default=now_iso)
    edited_at = Column(String, nullable=True)
    thread = relationship("CommentThread", back_populates="comments")


class DocumentFlag(Base):
    """A flag raised on a document."""
    __tablename__ = "document_flags"
    __table_args__ = (
        Index("ix_document_flags_entity", "entity_type", "entity_id"),
        Index("ix_document_flags_status", "status"),
    )
    id = Column(String, primary_key=True, default=uid)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String, nullable=False)
    reason = Column(Text, default="")
    flag_type = Column(String(50), default="review")
    status = Column(String(20), default="open")
    raised_by = Column(String(100), default="user")
    created_at = Column(String, default=now_iso)
    resolved_at = Column(String, nullable=True)


class TrackedChange(Base):
    """An agent-proposed edit shown inline for user accept/reject."""
    __tablename__ = "tracked_changes"
    __table_args__ = (
        Index("ix_tracked_changes_entity", "entity_type", "entity_id"),
        Index("ix_tracked_changes_status", "status"),
    )
    id = Column(String, primary_key=True, default=uid)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String, nullable=False)
    field = Column(String(100), nullable=False)
    before_text = Column(Text, default="")
    after_text = Column(Text, default="")
    change_summary = Column(String(500), default="")
    agent_type = Column(String(100), default="ai")
    status = Column(String(20), default="pending")
    created_at = Column(String, default=now_iso)
    resolved_at = Column(String, nullable=True)


class AgentChatMessage(Base):
    """A message in the persistent agent chat panel."""
    __tablename__ = "agent_chat_messages"
    __table_args__ = (
        Index("ix_agent_chat_project_id", "project_id"),
    )
    id = Column(String, primary_key=True, default=uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    context_module = Column(String(100), default="")
    context_entity_id = Column(String, default="")
    metadata_json = Column(Text, default="{}")
    created_at = Column(String, default=now_iso)
    project = relationship("Project", foreign_keys=[project_id])
