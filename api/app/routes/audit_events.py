from __future__ import annotations

from typing import Annotated

from app.auth import ProjectScope, require_project_scope, require_visible_section
from app.db import get_db
from app.schemas import AuditEventListItem
from app.services.audit_service import list_audit_events
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/audit-events", tags=["audit-events"])

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]
AuditAccessDep = Annotated[ProjectScope, Depends(require_visible_section("audit"))]


def _to_audit_event_item(record) -> AuditEventListItem:
    return AuditEventListItem(
        audit_event_id=record.audit_event_id,
        project_id=record.project_id,
        event_type=record.event_type,
        actor=record.actor,
        metadata=record.event_metadata,
        created_at=record.created_at,
    )


@router.get("", response_model=list[AuditEventListItem])
def get_audit_events(
    db: DbSession,
    project_scope: ProjectScopeDep,
    _audit_access: AuditAccessDep,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    event_type: str | None = Query(None),
) -> list[AuditEventListItem]:
    records = list_audit_events(
        db,
        project_id=project_scope.project_id,
        limit=limit,
        offset=offset,
        event_type=event_type,
    )
    return [_to_audit_event_item(record) for record in records]
