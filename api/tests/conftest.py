from __future__ import annotations

import hashlib
from collections.abc import Iterator
from uuid import UUID, uuid4

from app.models import ApiKey, Project, ProjectMembership, Role, Tenant, User
from sqlalchemy.orm import Session

TEST_API_KEY_PLAINTEXT = "test-api-key"


def _hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


def seed_tenant_project_and_key(
    db: Session,
    *,
    tenant_name: str = "Test Tenant",
    project_name: str = "Test Project",
    api_key_name: str = "test-key",
) -> tuple[UUID, UUID, UUID, str]:
    tenant_id = uuid4()
    project_id = uuid4()
    api_key_id = uuid4()
    tenant = Tenant(tenant_id=tenant_id, name=tenant_name)
    project = Project(project_id=project_id, tenant_id=tenant.tenant_id, name=project_name)
    api_key_plaintext = f"{TEST_API_KEY_PLAINTEXT}-{uuid4().hex[:8]}"
    api_key = ApiKey(
        api_key_id=api_key_id,
        tenant_id=tenant.tenant_id,
        name=api_key_name,
        key_hash=_hash_api_key(api_key_plaintext),
    )
    db.add_all([tenant, project, api_key])
    db.commit()
    return tenant_id, project_id, api_key_id, api_key_plaintext


def seed_project_membership_api_key(
    db: Session,
    *,
    role_name: str,
    pricing_tier: str = "team",
    tenant_name: str = "Membership Tenant",
    project_name: str = "Membership Project",
    api_key_name: str | None = None,
) -> tuple[UUID, UUID, UUID, UUID, str]:
    tenant_id = uuid4()
    project_id = uuid4()
    user_id = uuid4()
    role_id = uuid4()
    api_key_id = uuid4()
    email_slug = uuid4().hex[:10]

    tenant = Tenant(tenant_id=tenant_id, name=tenant_name, pricing_tier=pricing_tier)
    role = Role(role_id=role_id, name=role_name)
    user = User(
        user_id=user_id,
        email=f"{role_name}-{email_slug}@example.com",
        name=f"{role_name.title()} User",
    )
    project = Project(project_id=project_id, tenant_id=tenant_id, owner_id=user_id, name=project_name)
    membership = ProjectMembership(user_id=user_id, project_id=project_id, role_id=role_id)
    api_key_plaintext = f"{TEST_API_KEY_PLAINTEXT}-{uuid4().hex[:8]}"
    api_key = ApiKey(
        api_key_id=api_key_id,
        tenant_id=tenant_id,
        project_id=project_id,
        user_id=user_id,
        name=api_key_name or f"{role_name}-key",
        key_hash=_hash_api_key(api_key_plaintext),
    )
    db.add_all([tenant, role, user, project, membership, api_key])
    db.commit()
    return tenant_id, project_id, user_id, api_key_id, api_key_plaintext


def auth_headers(*, api_key: str, project_id: UUID | str) -> dict[str, str]:
    return {"X-API-Key": api_key, "X-Project-Id": str(project_id)}


def set_test_auth_session_factory(app, session_factory) -> Iterator[None]:
    app.state.auth_session_factory = session_factory
    try:
        yield
    finally:
        if hasattr(app.state, "auth_session_factory"):
            delattr(app.state, "auth_session_factory")
