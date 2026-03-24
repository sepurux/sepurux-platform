from __future__ import annotations

from typing import Annotated
from uuid import UUID

from app.auth import ProjectScope, TenantAuthContext, require_project_scope, require_role
from app.db import get_db
from app.schemas import (
    UserNotificationInboxResponse,
    UserNotificationItem,
    UserNotificationReadAllResponse,
)
from app.services.notification_service import (
    list_notifications,
    mark_all_notifications_read,
    mark_notification_read,
)
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/notifications", tags=["notifications"])

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]
TenantAuth = Annotated[TenantAuthContext, Depends(require_role("viewer"))]


def _to_notification_item(record) -> UserNotificationItem:
    severity = record.severity if record.severity in {"info", "warning", "critical"} else "info"
    metadata = record.notification_metadata if isinstance(record.notification_metadata, dict) else {}
    return UserNotificationItem(
        notification_id=record.notification_id,
        tenant_id=record.tenant_id,
        project_id=record.project_id,
        user_id=record.user_id,
        event_type=record.event_type,
        severity=severity,
        title=record.title,
        message=record.message,
        link_url=record.link_url,
        metadata=metadata,
        read_at=record.read_at,
        created_at=record.created_at,
    )


@router.get("", response_model=UserNotificationInboxResponse)
def get_notifications(
    db: DbSession,
    project_scope: ProjectScopeDep,
    tenant_auth: TenantAuth,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
) -> UserNotificationInboxResponse:
    items, unread_count = list_notifications(
        db,
        tenant_id=project_scope.tenant_id,
        project_id=project_scope.project_id,
        user_id=tenant_auth.user_id,
        limit=limit,
        offset=offset,
        unread_only=unread_only,
    )
    return UserNotificationInboxResponse(
        items=[_to_notification_item(item) for item in items],
        unread_count=unread_count,
    )


@router.post("/{notification_id}/read", response_model=UserNotificationItem)
def post_mark_notification_read(
    notification_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
    tenant_auth: TenantAuth,
) -> UserNotificationItem:
    record = mark_notification_read(
        db,
        notification_id=notification_id,
        tenant_id=project_scope.tenant_id,
        project_id=project_scope.project_id,
        user_id=tenant_auth.user_id,
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    return _to_notification_item(record)


@router.post("/read-all", response_model=UserNotificationReadAllResponse)
def post_mark_all_notifications_read(
    db: DbSession,
    project_scope: ProjectScopeDep,
    tenant_auth: TenantAuth,
) -> UserNotificationReadAllResponse:
    updated = mark_all_notifications_read(
        db,
        tenant_id=project_scope.tenant_id,
        project_id=project_scope.project_id,
        user_id=tenant_auth.user_id,
    )
    return UserNotificationReadAllResponse(updated=updated)
