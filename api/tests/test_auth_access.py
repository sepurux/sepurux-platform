from __future__ import annotations

from collections.abc import Generator
from uuid import UUID, uuid4

import pytest
from app.auth import hash_api_key
from app.db import get_db
from app.main import app
from app.models import ApiKey, Base, Project, ProjectMembership, Role, Tenant, User
from app.services.auth_service import hash_password
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import auth_headers


@pytest.fixture()
def auth_test_context() -> Generator[tuple[TestClient, sessionmaker[Session]], None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.state.auth_session_factory = testing_session_local

    with TestClient(app) as client:
        yield client, testing_session_local

    app.dependency_overrides.clear()
    if hasattr(app.state, "auth_session_factory"):
        delattr(app.state, "auth_session_factory")
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_signup_bootstraps_workspace_and_session(
    auth_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = auth_test_context

    response = client.post(
        "/auth/signup",
        json={
            "email": "alice@example.com",
            "password": "super-secret-123",
            "name": "Alice Example",
            "project_name": "Alice Sandbox",
            "pricing_tier": "enterprise",
        },
    )
    assert response.status_code == 201
    payload = response.json()

    assert payload["email"] == "alice@example.com"
    assert payload["name"] == "Alice Example"
    assert payload["project_name"] == "Alice Sandbox"
    assert payload["pricing_tier"] == "enterprise"
    assert payload["plan_name"] == "Enterprise"
    assert payload["role_name"] == "admin"
    assert payload["permissions"]["can_manage_api_keys"] is True
    assert "audit" in payload["permissions"]["visible_sections"]
    assert payload["api_key"].startswith("cl_")

    project_id = UUID(payload["project_id"])
    with session_factory() as db:
        user = db.scalar(select(User).where(User.email == "alice@example.com"))
        assert isinstance(user, User)
        assert user.password_hash is not None

        project = db.scalar(select(Project).where(Project.project_id == project_id))
        assert isinstance(project, Project)
        assert project.owner_id == user.user_id

        membership = db.scalar(
            select(ProjectMembership).where(
                ProjectMembership.user_id == user.user_id,
                ProjectMembership.project_id == project_id,
            )
        )
        assert isinstance(membership, ProjectMembership)

        api_key = db.scalar(
            select(ApiKey).where(ApiKey.key_hash == hash_api_key(payload["api_key"]))
        )
        assert isinstance(api_key, ApiKey)
        assert api_key.user_id == user.user_id
        assert api_key.project_id == project_id

    session_response = client.get(
        "/v1/auth/session",
        headers=auth_headers(api_key=payload["api_key"], project_id=project_id),
    )
    assert session_response.status_code == 200
    session_payload = session_response.json()
    assert session_payload["email"] == "alice@example.com"
    assert session_payload["pricing_tier"] == "enterprise"
    assert session_payload["role_name"] == "admin"
    assert session_payload["permissions"]["can_manage_workspace"] is True


def test_signup_with_starter_plan_hides_team_and_enterprise_sections(
    auth_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, _session_factory = auth_test_context

    response = client.post(
        "/auth/signup",
        json={
            "email": "starter@example.com",
            "password": "starter-pass-123",
            "pricing_tier": "starter",
        },
    )
    assert response.status_code == 201
    payload = response.json()

    assert payload["pricing_tier"] == "starter"
    assert payload["plan_name"] == "Starter"
    assert "mutation-packs" in payload["permissions"]["visible_sections"]
    assert "policies" not in payload["permissions"]["visible_sections"]
    assert "audit" not in payload["permissions"]["visible_sections"]


def test_login_returns_project_scoped_session_for_existing_user(
    auth_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = auth_test_context
    tenant_id = uuid4()
    user_id = uuid4()
    project_id = uuid4()
    role_id = uuid4()

    with session_factory() as db:
        db.add(Tenant(tenant_id=tenant_id, name="Beta Tenant", pricing_tier="team"))
        db.add(Role(role_id=role_id, name="developer"))
        db.add(
            User(
                user_id=user_id,
                email="dev@example.com",
                name="Dev User",
                password_hash=hash_password("super-secret-123"),
            )
        )
        db.add(
            Project(
                project_id=project_id, tenant_id=tenant_id, owner_id=user_id, name="Beta Project"
            )
        )
        db.add(ProjectMembership(user_id=user_id, project_id=project_id, role_id=role_id))
        db.commit()

    response = client.post(
        "/auth/login",
        json={"email": "dev@example.com", "password": "super-secret-123"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["project_id"] == str(project_id)
    assert payload["pricing_tier"] == "team"
    assert payload["plan_name"] == "Team"
    assert payload["role_name"] == "developer"
    assert payload["permissions"]["can_run_campaigns"] is True
    assert payload["permissions"]["can_manage_mutation_packs"] is True
    assert payload["permissions"]["can_manage_policy_packs"] is False
    assert payload["permissions"]["can_manage_security_config"] is False
    assert payload["permissions"]["can_manage_api_keys"] is False
    assert "campaigns" in payload["permissions"]["visible_sections"]
    assert "audit" not in payload["permissions"]["visible_sections"]


def test_viewer_login_gets_read_only_dashboard_sections(
    auth_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = auth_test_context
    tenant_id = uuid4()
    user_id = uuid4()
    project_id = uuid4()
    role_id = uuid4()

    with session_factory() as db:
        db.add(Tenant(tenant_id=tenant_id, name="Viewer Tenant", pricing_tier="starter"))
        db.add(Role(role_id=role_id, name="viewer"))
        db.add(
            User(
                user_id=user_id,
                email="viewer@example.com",
                name="Viewer User",
                password_hash=hash_password("viewer-pass-123"),
            )
        )
        db.add(
            Project(
                project_id=project_id, tenant_id=tenant_id, owner_id=user_id, name="Viewer Project"
            )
        )
        db.add(ProjectMembership(user_id=user_id, project_id=project_id, role_id=role_id))
        db.commit()

    response = client.post(
        "/auth/login",
        json={"email": "viewer@example.com", "password": "viewer-pass-123"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["pricing_tier"] == "starter"
    assert payload["role_name"] == "viewer"
    assert payload["permissions"]["visible_sections"] == ["dashboard", "reports", "settings"]
    assert payload["permissions"]["can_upload_traces"] is False
    assert payload["permissions"]["can_create_campaigns"] is False
    assert payload["permissions"]["can_manage_mutation_packs"] is False
    assert payload["permissions"]["can_manage_policy_packs"] is False
    assert payload["permissions"]["can_manage_security_config"] is False
