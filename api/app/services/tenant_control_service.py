from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from app.models import ApiKey, Project, Tenant, TenantControl
from sqlalchemy import select
from sqlalchemy.orm import Session

RUNS_PAUSED_DETAIL = "Run creation is paused for this tenant."
WORKSPACE_CREATION_LOCKED_DETAIL = "Workspace creation is locked for this tenant."


class TenantControlViolationError(Exception):
    pass


def _require_tenant_exists(db: Session, *, tenant_id: UUID) -> None:
    tenant = db.scalar(select(Tenant).where(Tenant.tenant_id == tenant_id))
    if tenant is None:
        raise ValueError("Tenant not found")


def get_or_create_tenant_controls(db: Session, *, tenant_id: UUID) -> TenantControl:
    _require_tenant_exists(db, tenant_id=tenant_id)

    controls = db.scalar(select(TenantControl).where(TenantControl.tenant_id == tenant_id))
    if isinstance(controls, TenantControl):
        return controls

    controls = TenantControl(tenant_id=tenant_id)
    db.add(controls)
    db.flush()
    return controls


def update_tenant_controls(
    db: Session,
    *,
    tenant_id: UUID,
    runs_paused: bool | None = None,
    workspace_creation_locked: bool | None = None,
    updated_by: str | None = None,
    reason: str | None = None,
) -> TenantControl:
    controls = get_or_create_tenant_controls(db, tenant_id=tenant_id)

    if runs_paused is not None:
        controls.runs_paused = bool(runs_paused)
    if workspace_creation_locked is not None:
        controls.workspace_creation_locked = bool(workspace_creation_locked)
    if updated_by is not None:
        controls.updated_by = updated_by.strip() or None
    if reason is not None:
        controls.reason = reason.strip() or None

    db.add(controls)
    db.flush()
    return controls


def revoke_tenant_api_keys(db: Session, *, tenant_id: UUID) -> int:
    _require_tenant_exists(db, tenant_id=tenant_id)

    active_keys = list(
        db.scalars(select(ApiKey).where(ApiKey.tenant_id == tenant_id, ApiKey.revoked_at.is_(None)))
    )
    if not active_keys:
        return 0

    revoked_at = datetime.now(UTC)
    for record in active_keys:
        record.revoked_at = revoked_at
        db.add(record)
    db.flush()
    return len(active_keys)


def assert_tenant_runs_allowed(db: Session, *, tenant_id: UUID) -> None:
    runs_paused = db.scalar(
        select(TenantControl.runs_paused).where(TenantControl.tenant_id == tenant_id)
    )
    if bool(runs_paused):
        raise TenantControlViolationError(RUNS_PAUSED_DETAIL)


def assert_tenant_workspace_creation_allowed(db: Session, *, tenant_id: UUID) -> None:
    workspace_creation_locked = db.scalar(
        select(TenantControl.workspace_creation_locked).where(TenantControl.tenant_id == tenant_id)
    )
    if bool(workspace_creation_locked):
        raise TenantControlViolationError(WORKSPACE_CREATION_LOCKED_DETAIL)


def assert_project_runs_allowed(db: Session, *, project_id: UUID) -> None:
    tenant_id = db.scalar(select(Project.tenant_id).where(Project.project_id == project_id))
    if tenant_id is None:
        return
    assert_tenant_runs_allowed(db, tenant_id=tenant_id)
