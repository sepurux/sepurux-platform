from __future__ import annotations

from collections.abc import Generator
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from app.auth import hash_api_key
from app.db import get_db
from app.main import app
from app.models import ApiKey, Base, Project, Tenant, TenantControl
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import auth_headers, seed_project_membership_api_key, seed_tenant_project_and_key


@pytest.fixture()
def auth_test_context() -> (
    Generator[tuple[TestClient, sessionmaker[Session], UUID, str], None, None]
):
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    with testing_session_local() as db:
        _, project_id, _, api_key_plaintext = seed_tenant_project_and_key(db)

    def override_get_db() -> Generator[Session, None, None]:
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.state.auth_session_factory = testing_session_local

    with TestClient(app) as client:
        client.headers.update(auth_headers(api_key=api_key_plaintext, project_id=project_id))
        yield client, testing_session_local, project_id, api_key_plaintext

    app.dependency_overrides.clear()
    if hasattr(app.state, "auth_session_factory"):
        delattr(app.state, "auth_session_factory")
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_v1_requires_api_key_header(
    auth_test_context: tuple[TestClient, sessionmaker[Session], UUID, str],
) -> None:
    client, _, _, _ = auth_test_context
    original = client.headers.get("X-API-Key")
    client.headers.pop("X-API-Key", None)
    try:
        response = client.get("/v1/projects")
    finally:
        if original is not None:
            client.headers["X-API-Key"] = original

    assert response.status_code == 401
    assert response.json() == {"detail": "X-API-Key header is required"}


def test_project_scoped_endpoints_require_project_header(
    auth_test_context: tuple[TestClient, sessionmaker[Session], UUID, str],
) -> None:
    client, _, _, _ = auth_test_context
    original = client.headers.get("X-Project-Id")
    client.headers.pop("X-Project-Id", None)
    try:
        response = client.get("/v1/runs")
    finally:
        if original is not None:
            client.headers["X-Project-Id"] = original

    assert response.status_code == 400
    assert response.json() == {"detail": "X-Project-Id header is required"}


def test_projects_list_and_create_are_scoped_to_authenticated_tenant(
    auth_test_context: tuple[TestClient, sessionmaker[Session], UUID, str],
) -> None:
    client, testing_session_local, project_id, _ = auth_test_context
    other_tenant_id = uuid4()
    other_project_id = uuid4()

    with testing_session_local() as db:
        db.add(Tenant(tenant_id=other_tenant_id, name="Other Tenant"))
        db.add(
            Project(project_id=other_project_id, tenant_id=other_tenant_id, name="Other Project")
        )
        db.commit()

    create_response = client.post("/v1/projects", json={"name": "New Tenant Project"})
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["tenant_id"] != str(other_tenant_id)

    list_response = client.get("/v1/projects")
    assert list_response.status_code == 200
    items = list_response.json()
    item_ids = {item["project_id"] for item in items}
    assert str(project_id) in item_ids
    assert created["project_id"] in item_ids
    assert str(other_project_id) not in item_ids


def test_create_project_requires_team_or_enterprise_plan(
    auth_test_context: tuple[TestClient, sessionmaker[Session], UUID, str],
) -> None:
    client, testing_session_local, _, _ = auth_test_context
    with testing_session_local() as db:
        _, _, _, _, starter_api_key = seed_project_membership_api_key(
            db,
            role_name="admin",
            pricing_tier="starter",
        )

    response = client.post(
        "/v1/projects",
        json={"name": "Starter Extra Project"},
        headers={"X-API-Key": starter_api_key},
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Upgrade to Team or Enterprise to add workspaces."}


def test_create_project_returns_423_when_workspace_creation_is_locked(
    auth_test_context: tuple[TestClient, sessionmaker[Session], UUID, str],
) -> None:
    client, testing_session_local, project_id, _ = auth_test_context

    with testing_session_local() as db:
        project = db.scalar(select(Project).where(Project.project_id == project_id))
        assert isinstance(project, Project)
        db.add(
            TenantControl(
                tenant_id=project.tenant_id,
                workspace_creation_locked=True,
            )
        )
        db.commit()

    response = client.post("/v1/projects", json={"name": "Blocked Project"})

    assert response.status_code == 423
    assert response.json() == {"detail": "Workspace creation is locked for this tenant."}


def test_project_scoped_api_key_only_sees_its_bound_project(
    auth_test_context: tuple[TestClient, sessionmaker[Session], UUID, str],
) -> None:
    client, testing_session_local, project_id, _ = auth_test_context
    scoped_project_id = uuid4()
    scoped_api_key = f"project-key-{uuid4().hex[:8]}"

    with testing_session_local() as db:
        seeded_project = db.scalar(select(Project).where(Project.project_id == project_id))
        assert isinstance(seeded_project, Project)
        db.add(
            Project(
                project_id=scoped_project_id,
                tenant_id=seeded_project.tenant_id,
                name="Scoped Project",
            )
        )
        db.add(
            ApiKey(
                api_key_id=uuid4(),
                tenant_id=seeded_project.tenant_id,
                project_id=scoped_project_id,
                name="scoped-project-key",
                key_hash=hash_api_key(scoped_api_key),
            )
        )
        db.commit()

    response = client.get("/v1/projects", headers={"X-API-Key": scoped_api_key})

    assert response.status_code == 200
    items = response.json()
    assert [item["project_id"] for item in items] == [str(scoped_project_id)]


def test_post_api_keys_returns_plaintext_once_and_stores_hash(
    auth_test_context: tuple[TestClient, sessionmaker[Session], UUID, str],
) -> None:
    client, testing_session_local, _, _ = auth_test_context

    response = client.post("/v1/api-keys", json={"name": "CI Key"})

    assert response.status_code == 201
    payload = response.json()
    assert payload["name"] == "CI Key"
    assert payload["api_key"].startswith("cl_")

    with testing_session_local() as db:
        row = db.execute(
            select(ApiKey).where(ApiKey.api_key_id == UUID(payload["api_key_id"]))
        ).scalar_one()
        assert row.key_hash != payload["api_key"]


def test_get_api_keys_returns_metadata_without_plaintext_and_scopes_tenant(
    auth_test_context: tuple[TestClient, sessionmaker[Session], UUID, str],
) -> None:
    client, testing_session_local, _, _ = auth_test_context
    other_tenant_id = uuid4()
    other_api_key_id = uuid4()

    with testing_session_local() as db:
        db.add(Tenant(tenant_id=other_tenant_id, name="Other Tenant"))
        db.add(
            ApiKey(
                api_key_id=other_api_key_id,
                tenant_id=other_tenant_id,
                name="Other Tenant Key",
                key_hash=f"other-{uuid4().hex}",
            )
        )
        db.commit()

    create_response = client.post("/v1/api-keys", json={"name": "CI Key"})
    assert create_response.status_code == 201

    list_response = client.get("/v1/api-keys")
    assert list_response.status_code == 200
    items = list_response.json()
    assert len(items) >= 1
    assert all("api_key" not in item for item in items)
    assert all(item["tenant_id"] != str(other_tenant_id) for item in items)
    assert all(item["api_key_id"] != str(other_api_key_id) for item in items)


def test_cross_tenant_project_scope_returns_403(
    auth_test_context: tuple[TestClient, sessionmaker[Session], UUID, str],
) -> None:
    client, testing_session_local, project_id, _ = auth_test_context
    other_tenant_id = uuid4()
    other_project_id = uuid4()

    with testing_session_local() as db:
        db.add(Tenant(tenant_id=other_tenant_id, name="Other Tenant"))
        db.add(
            Project(
                project_id=other_project_id,
                tenant_id=other_tenant_id,
                name="Other Tenant Project",
            )
        )
        db.commit()

    client.headers["X-Project-Id"] = str(other_project_id)
    response = client.get("/v1/runs")
    client.headers["X-Project-Id"] = str(project_id)

    assert response.status_code == 403
    assert response.json() == {"detail": "Project does not belong to authenticated tenant"}


def test_revoked_api_key_returns_401(
    auth_test_context: tuple[TestClient, sessionmaker[Session], UUID, str],
) -> None:
    client, testing_session_local, _, _ = auth_test_context

    with testing_session_local() as db:
        record = db.execute(select(ApiKey)).scalar_one()
        record.revoked_at = datetime.now(UTC)
        db.add(record)
        db.commit()

    response = client.get("/v1/projects")

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid API key"}
