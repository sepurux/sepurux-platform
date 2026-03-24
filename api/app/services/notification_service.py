from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.models import UserNotification
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

_SEVERITY_VALUES = {"info", "warning", "critical"}


def _scope_filters(
    *,
    tenant_id: UUID,
    project_id: UUID,
    user_id: UUID | None,
):
    filters = [
        UserNotification.tenant_id == tenant_id,
        UserNotification.project_id == project_id,
    ]
    if user_id is None:
        filters.append(UserNotification.user_id.is_(None))
    else:
        filters.append(
            or_(
                UserNotification.user_id.is_(None),
                UserNotification.user_id == user_id,
            )
        )
    return filters


def create_notification(
    db: Session,
    *,
    tenant_id: UUID,
    project_id: UUID,
    title: str,
    message: str,
    event_type: str = "system",
    severity: str = "info",
    link_url: str | None = None,
    user_id: UUID | None = None,
    metadata: dict[str, object] | None = None,
) -> UserNotification:
    normalized_severity = severity.strip().lower() if isinstance(severity, str) else "info"
    if normalized_severity not in _SEVERITY_VALUES:
        normalized_severity = "info"

    record = UserNotification(
        notification_id=uuid4(),
        tenant_id=tenant_id,
        project_id=project_id,
        user_id=user_id,
        event_type=(event_type.strip().lower() if event_type else "system"),
        severity=normalized_severity,
        title=title.strip(),
        message=message.strip(),
        link_url=link_url.strip() if isinstance(link_url, str) and link_url.strip() else None,
        notification_metadata=metadata or {},
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_notifications(
    db: Session,
    *,
    tenant_id: UUID,
    project_id: UUID,
    user_id: UUID | None,
    limit: int = 20,
    offset: int = 0,
    unread_only: bool = False,
) -> tuple[list[UserNotification], int]:
    filters = _scope_filters(tenant_id=tenant_id, project_id=project_id, user_id=user_id)
    stmt = select(UserNotification).where(*filters)
    if unread_only:
        stmt = stmt.where(UserNotification.read_at.is_(None))
    stmt = (
        stmt.order_by(UserNotification.created_at.desc(), UserNotification.notification_id.desc())
        .offset(offset)
        .limit(limit)
    )
    items = list(db.scalars(stmt))

    unread_count = int(
        db.scalar(
            select(func.count())
            .select_from(UserNotification)
            .where(*filters, UserNotification.read_at.is_(None))
        )
        or 0
    )
    return items, unread_count


def mark_notification_read(
    db: Session,
    *,
    notification_id: UUID,
    tenant_id: UUID,
    project_id: UUID,
    user_id: UUID | None,
) -> UserNotification | None:
    filters = _scope_filters(tenant_id=tenant_id, project_id=project_id, user_id=user_id)
    record = db.scalar(
        select(UserNotification).where(
            UserNotification.notification_id == notification_id,
            *filters,
        )
    )
    if record is None:
        return None
    if record.read_at is None:
        record.read_at = datetime.now(UTC)
        db.add(record)
        db.commit()
        db.refresh(record)
    return record


def mark_all_notifications_read(
    db: Session,
    *,
    tenant_id: UUID,
    project_id: UUID,
    user_id: UUID | None,
) -> int:
    filters = _scope_filters(tenant_id=tenant_id, project_id=project_id, user_id=user_id)
    records = list(
        db.scalars(
            select(UserNotification).where(
                *filters,
                UserNotification.read_at.is_(None),
            )
        )
    )
    if not records:
        return 0
    now = datetime.now(UTC)
    for record in records:
        record.read_at = now
        db.add(record)
    db.commit()
    return len(records)
