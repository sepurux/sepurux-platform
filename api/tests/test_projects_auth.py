from __future__ import annotations

from collections.abc import Generator
from uuid import UUID, uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import ApiKey, Base, Project, Tenant
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import auth_headers, seed_tenant_project_and_key


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
