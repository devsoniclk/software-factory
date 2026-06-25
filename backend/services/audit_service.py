"""Audit service : logs every state change to AuditLog table."""
import json
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.database import AuditLog


class AuditService:
    """Records entity lifecycle events for full traceability."""

    @staticmethod
    async def log(
        db: AsyncSession,
        entity_type: str,
        entity_id: str,
        action: str,
        actor: str = "user",
        before: dict | None = None,
        after: dict | None = None,
        rationale: str = "",
    ) -> AuditLog:
        entry = AuditLog(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            actor=actor,
            before_json=json.dumps(before or {}),
            after_json=json.dumps(after or {}),
            rationale=rationale,
        )
        db.add(entry)
        await db.commit()
        await db.refresh(entry)
        return entry

    @staticmethod
    async def log_create(db: AsyncSession, entity_type: str, entity_id: str, data: dict, actor: str = "user"):
        return await AuditService.log(db, entity_type, entity_id, "create", actor=actor, after=data)

    @staticmethod
    async def log_update(db: AsyncSession, entity_type: str, entity_id: str, before: dict, after: dict, actor: str = "user"):
        return await AuditService.log(db, entity_type, entity_id, "update", actor=actor, before=before, after=after)

    @staticmethod
    async def log_delete(db: AsyncSession, entity_type: str, entity_id: str, data: dict, actor: str = "user"):
        return await AuditService.log(db, entity_type, entity_id, "delete", actor=actor, before=data)

    @staticmethod
    async def log_status_change(db: AsyncSession, entity_type: str, entity_id: str, old_status: str, new_status: str, actor: str = "user"):
        return await AuditService.log(
            db, entity_type, entity_id, "status_change", actor=actor,
            before={"status": old_status}, after={"status": new_status},
        )


audit_service = AuditService()
