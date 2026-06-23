"""All SQLAlchemy models for 1024 Studio."""
import enum, uuid, json
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from backend.models.engine import Base


def uid() -> str:
    return uuid.uuid4().hex[:12]

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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
    created_at = Column(String, default=now_iso)
    updated_at = Column(String, default=now_iso, onupdate=now_iso)
    requirements = relationship("Requirement", cascade="all,delete-orphan", back_populates="project")
    blueprints = relationship("Blueprint", cascade="all,delete-orphan", back_populates="project")
    feedbacks = relationship("Feedback", cascade="all,delete-orphan", back_populates="project")


class Requirement(Base):
    __tablename__ = "requirements"
    id = Column(String, primary_key=True, default=uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(1000), nullable=False)
    description = Column(Text, default="")
    priority = Column(Integer, default=3)
    status = Column(SAEnum(ReqStatus), default=ReqStatus.DRAFT)
    acceptance_criteria_json = Column(Text, default="[]")
    ai_generated = Column(Boolean, default=False)
    created_by = Column(String(100), default="user")
    created_at = Column(String, default=now_iso)
    project = relationship("Project", back_populates="requirements")
    test_cases = relationship("TestCase", cascade="all,delete-orphan", back_populates="requirement")


class Blueprint(Base):
    __tablename__ = "blueprints"
    id = Column(String, primary_key=True, default=uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(500), nullable=False)
    description = Column(Text, default="")
    decisions_json = Column(Text, default="[]")
    components_json = Column(Text, default="[]")
    constraints_json = Column(Text, default="[]")
    version = Column(Integer, default=1)
    created_at = Column(String, default=now_iso)
    project = relationship("Project", back_populates="blueprints")
    work_orders = relationship("WorkOrder", cascade="all,delete-orphan", back_populates="blueprint")


class WorkOrder(Base):
    __tablename__ = "work_orders"
    id = Column(String, primary_key=True, default=uid)
    blueprint_id = Column(String, ForeignKey("blueprints.id", ondelete="CASCADE"), nullable=False)
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
