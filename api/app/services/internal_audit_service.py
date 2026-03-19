from __future__ import annotations

from typing import Any
from uuid import uuid4

from app.models import AuditLog
from sqlalchemy.orm import Session


def create_audit_log(
    db: Session,
    *,
    action: str,
    actor: str,
    entity: str,
    metadata: dict[str, Any] | None = None,
) -> AuditLog:
    record = AuditLog(
        id=uuid4(),
        action=action,
        actor=actor,
        entity=entity,
        audit_metadata=metadata or {},
    )
    db.add(record)
    db.flush()
    return record
