from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal, get_db
from app.models import ApiKey, Project

# Deterministic dev seed values inserted by the Alembic migration for local compose usage.
DEV_TENANT_ID = UUID("11111111-1111-1111-1111-111111111111")
DEV_PROJECT_ID = UUID("22222222-2222-2222-2222-222222222222")
DEV_API_KEY_NAME = "dev-default"
DEV_API_KEY_PLAINTEXT = "sepurux-dev-key"


@dataclass(frozen=True)
class TenantAuthContext:
    tenant_id: UUID
    api_key_id: UUID
    api_key_name: str | None = None


@dataclass(frozen=True)
class ProjectScope:
    tenant_id: UUID
    project_id: UUID


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
    if not project_id_value:
        raise HTTPException(status_code=400, detail="X-Project-Id header is required")

    try:
        project_id = UUID(project_id_value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid X-Project-Id header") from exc

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
    )
    request.state.project_scope = project_scope
    return project_scope


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
        record.last_used_at = datetime.now(UTC)
        db.add(record)
        db.commit()
        return TenantAuthContext(
            tenant_id=record.tenant_id,
            api_key_id=record.api_key_id,
            api_key_name=record.name,
        )
