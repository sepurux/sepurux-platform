from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from app.auth import TenantAuthContext
from app.models import AuditEvent
from fastapi import Request
from sqlalchemy import select
from sqlalchemy.orm import Session


def create_audit_event(
    db: Session,
    *,
    project_id: UUID,
    event_type: str,
    metadata: Any,
    actor: str | None = None,
) -> AuditEvent:
    record = AuditEvent(
        audit_event_id=uuid4(),
        project_id=project_id,
        event_type=event_type,
        actor=actor,
        event_metadata=metadata if metadata is not None else {},
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_audit_events(
    db: Session,
    *,
    project_id: UUID,
    limit: int = 50,
    offset: int = 0,
    event_type: str | None = None,
) -> list[AuditEvent]:
    stmt = select(AuditEvent).where(AuditEvent.project_id == project_id)
    if event_type:
        stmt = stmt.where(AuditEvent.event_type == event_type)
    stmt = (
        stmt.order_by(AuditEvent.created_at.desc(), AuditEvent.audit_event_id.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(db.scalars(stmt))


def actor_from_request(request: Request) -> str | None:
    tenant_auth = getattr(request.state, "tenant_auth", None)
    if isinstance(tenant_auth, TenantAuthContext):
        if tenant_auth.api_key_name:
            return tenant_auth.api_key_name
        return str(tenant_auth.api_key_id)
    return None
