from __future__ import annotations

import hashlib
from collections.abc import Iterator
from uuid import UUID, uuid4

from app.models import ApiKey, Project, Tenant
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


def auth_headers(*, api_key: str, project_id: UUID | str) -> dict[str, str]:
    return {"X-API-Key": api_key, "X-Project-Id": str(project_id)}


def set_test_auth_session_factory(app, session_factory) -> Iterator[None]:
    app.state.auth_session_factory = session_factory
    try:
        yield
    finally:
        if hasattr(app.state, "auth_session_factory"):
            delattr(app.state, "auth_session_factory")
