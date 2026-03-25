from __future__ import annotations

import hashlib
import os
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal, get_db
from app.models import (
    ApiKey,
    Project,
    ProjectMembership,
    Role,
    SubscriptionPlan,
    Tenant,
    User,
    UserSubscription,
)
from app.services.pricing_service import build_auth_permissions

# Deterministic dev seed values inserted by the Alembic migration for local compose usage.
DEV_TENANT_ID = UUID("11111111-1111-1111-1111-111111111111")
DEV_PROJECT_ID = UUID("22222222-2222-2222-2222-222222222222")
DEV_API_KEY_NAME = "dev-default"
DEV_API_KEY_PLAINTEXT = "sepurux-dev-key"
DEMO_API_KEY_PLAINTEXT = "demo_sepurux_key"

ROLE_RANKS: dict[str, int] = {"viewer": 1, "developer": 2, "admin": 3, "super_admin": 4}


@dataclass(frozen=True)
class TenantAuthContext:
    tenant_id: UUID
    api_key_id: UUID
    api_key_name: str | None = None
    project_id: UUID | None = None
    user_id: UUID | None = None
    role_name: str = "admin"
    is_demo: bool = False
    rate_limit_per_minute: int = 120


@dataclass(frozen=True)
class ProjectScope:
    tenant_id: UUID
    project_id: UUID
    role_name: str
    is_demo: bool


DbSession = Annotated[Session, Depends(get_db)]
ProjectIdHeader = Annotated[str | None, Header(alias="X-Project-Id")]


def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


def generate_api_key() -> str:
    return f"cl_{secrets.token_urlsafe(24)}"


def get_auth_session_factory(request: Request):
    return getattr(request.app.state, "auth_session_factory", SessionLocal)


def get_tenant_auth(request: Request) -> TenantAuthContext:
    auth_ctx = getattr(request.state, "tenant_auth", None)
    if not isinstance(auth_ctx, TenantAuthContext):
        raise HTTPException(status_code=401, detail="Unauthorized")
    return auth_ctx


TenantAuthDep = Annotated[TenantAuthContext, Depends(get_tenant_auth)]


def require_project_scope(
    request: Request,
    db: DbSession,
    tenant_auth: TenantAuthDep,
    project_id_value: ProjectIdHeader = None,
) -> ProjectScope:
    if project_id_value:
        try:
            project_id = UUID(project_id_value)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid X-Project-Id header") from exc
    elif tenant_auth.project_id is not None:
        project_id = tenant_auth.project_id
    else:
        raise HTTPException(status_code=400, detail="X-Project-Id header is required")

    if tenant_auth.project_id is not None and project_id != tenant_auth.project_id:
        raise HTTPException(status_code=403, detail="API key is restricted to a different project")

    stmt = select(Project).where(Project.project_id == project_id)
    project = db.scalar(stmt)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.tenant_id != tenant_auth.tenant_id:
        raise HTTPException(
            status_code=403, detail="Project does not belong to authenticated tenant"
        )

    project_scope = ProjectScope(
        tenant_id=tenant_auth.tenant_id,
        project_id=project.project_id,
        role_name=tenant_auth.role_name,
        is_demo=tenant_auth.is_demo,
    )
    request.state.project_scope = project_scope
    return project_scope


ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]


def require_role(role_name: str):
    normalized_required_role = role_name.strip().lower()
    required_rank = ROLE_RANKS.get(normalized_required_role)
    if required_rank is None:
        raise ValueError(f"Unsupported role requirement: {role_name}")

    def dependency(tenant_auth: TenantAuthDep) -> TenantAuthContext:
        current_rank = ROLE_RANKS.get(tenant_auth.role_name, 0)
        if current_rank < required_rank:
            raise HTTPException(
                status_code=403,
                detail=f"{normalized_required_role} role required",
            )
        return tenant_auth

    return dependency


def _configured_super_admin_emails() -> set[str]:
    raw = os.getenv("SUPER_ADMIN_EMAILS", "")
    return {item.strip().lower() for item in raw.split(",") if item.strip()}


def is_super_admin(db: Session, tenant_auth: TenantAuthContext) -> bool:
    if tenant_auth.role_name == "super_admin":
        return True

    if tenant_auth.user_id is None:
        return False

    user = db.scalar(select(User).where(User.user_id == tenant_auth.user_id))
    if not isinstance(user, User):
        return False

    allowed_emails = _configured_super_admin_emails()
    if not allowed_emails:
        return False

    return user.email.strip().lower() in allowed_emails


def require_super_admin(db: DbSession, tenant_auth: TenantAuthDep) -> TenantAuthContext:
    if not is_super_admin(db, tenant_auth):
        raise HTTPException(status_code=403, detail="Super admin access required")
    return tenant_auth


def _project_permission_bundle(db: Session, project_scope: ProjectScope):
    tenant = db.scalar(select(Tenant).where(Tenant.tenant_id == project_scope.tenant_id))
    pricing_tier = tenant.pricing_tier if isinstance(tenant, Tenant) else None
    project = db.scalar(select(Project).where(Project.project_id == project_scope.project_id))
    billing_plan_name: str | None = None
    if isinstance(project, Project) and project.owner_id is not None:
        subscription = db.scalar(
            select(UserSubscription).where(UserSubscription.user_id == project.owner_id)
        )
        if isinstance(subscription, UserSubscription):
            plan = db.scalar(
                select(SubscriptionPlan).where(SubscriptionPlan.plan_id == subscription.plan_id)
            )
            if isinstance(plan, SubscriptionPlan):
                billing_plan_name = plan.name
    return build_auth_permissions(
        project_scope.role_name,
        pricing_tier,
        billing_plan_name=billing_plan_name,
    )


def require_visible_section(section_name: str):
    def dependency(db: DbSession, project_scope: ProjectScopeDep) -> ProjectScope:
        permissions = _project_permission_bundle(db, project_scope)
        if section_name not in permissions.visible_sections:
            raise HTTPException(
                status_code=403,
                detail=f"{section_name} access is not available for this workspace membership",
            )
        return project_scope

    return dependency


def require_permission(permission_name: str, *, section_name: str | None = None):
    def dependency(db: DbSession, project_scope: ProjectScopeDep) -> ProjectScope:
        permissions = _project_permission_bundle(db, project_scope)
        if section_name is not None and section_name not in permissions.visible_sections:
            raise HTTPException(
                status_code=403,
                detail=f"{section_name} access is not available for this workspace membership",
            )

        if not bool(getattr(permissions, permission_name, False)):
            raise HTTPException(
                status_code=403,
                detail=f"{permission_name} is not available for this workspace membership",
            )
        return project_scope

    return dependency


def _get_role_name_for_api_key(db: Session, api_key: ApiKey) -> str:
    if api_key.is_demo:
        return "admin"

    if api_key.project_id is not None and api_key.user_id is not None:
        membership = db.scalar(
            select(ProjectMembership).where(
                ProjectMembership.user_id == api_key.user_id,
                ProjectMembership.project_id == api_key.project_id,
            )
        )
        if isinstance(membership, ProjectMembership):
            role = db.scalar(select(Role).where(Role.role_id == membership.role_id))
            if isinstance(role, Role) and role.name in ROLE_RANKS:
                return role.name

    return "admin"


def authenticate_api_key_value(request: Request, api_key_value: str) -> TenantAuthContext | None:
    session_factory = get_auth_session_factory(request)
    key_hash = hash_api_key(api_key_value)
    with session_factory() as db:
        stmt = select(ApiKey).where(ApiKey.key_hash == key_hash)
        record = db.scalar(stmt)
        if record is None:
            return None
        if record.revoked_at is not None:
            return None
        now = datetime.now(UTC)
        window_started_at = record.window_started_at
        if isinstance(window_started_at, datetime) and window_started_at.tzinfo is None:
            # SQLite can return naive datetimes even when timezone=True is configured.
            window_started_at = window_started_at.replace(tzinfo=UTC)
            record.window_started_at = window_started_at

        if window_started_at is None or now - window_started_at >= timedelta(minutes=1):
            record.window_started_at = now
            record.request_count_window = 0

        rate_limit = max(int(record.rate_limit_per_minute or 0), 0)
        if rate_limit > 0 and record.request_count_window >= rate_limit:
            raise HTTPException(status_code=429, detail="API key rate limit exceeded")

        record.request_count_window = int(record.request_count_window or 0) + 1
        record.last_used_at = now
        role_name = _get_role_name_for_api_key(db, record)
        db.add(record)
        db.commit()
        return TenantAuthContext(
            tenant_id=record.tenant_id,
            api_key_id=record.api_key_id,
            api_key_name=record.name,
            project_id=record.project_id,
            user_id=record.user_id,
            role_name=role_name,
            is_demo=bool(record.is_demo),
            rate_limit_per_minute=rate_limit,
        )
