from __future__ import annotations

from collections.abc import Generator

import pytest
from app.db import get_db
from app.main import app
from app.models import Base
from app.services.billing_service import ENTERPRISE_PLAN_ID, PRO_PLAN_ID, subscribe_user
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import auth_headers, seed_project_membership_api_key


@pytest.fixture()
def members_test_context() -> Generator[tuple[TestClient, sessionmaker[Session]], None, None]:
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


def test_invite_member_requires_team_or_enterprise_plan(
    members_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, testing_session_local = members_test_context
    with testing_session_local() as db:
        _, project_id, _, _, api_key_plaintext = seed_project_membership_api_key(
            db,
            role_name="admin",
            pricing_tier="starter",
        )

    client.headers.update(auth_headers(api_key=api_key_plaintext, project_id=project_id))
    response = client.post(
        "/v1/members",
        json={"email": "starter-invite@example.com", "role": "developer"},
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Upgrade to Team or Enterprise to invite members."}


def test_invite_member_allows_team_plan(
    members_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, testing_session_local = members_test_context
    with testing_session_local() as db:
        _, project_id, _, _, api_key_plaintext = seed_project_membership_api_key(
            db,
            role_name="admin",
            pricing_tier="team",
        )

    client.headers.update(auth_headers(api_key=api_key_plaintext, project_id=project_id))
    response = client.post(
        "/v1/members",
        json={"email": "team-invite@example.com", "name": "Team Invite", "role": "developer"},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["email"] == "team-invite@example.com"
    assert payload["role"] == "developer"
    assert isinstance(payload.get("api_key"), str)
    assert payload["api_key"].startswith("cl_")


def test_invite_member_allows_enterprise_plan(
    members_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, testing_session_local = members_test_context
    with testing_session_local() as db:
        tenant_id, project_id, user_id, _, api_key_plaintext = seed_project_membership_api_key(
            db,
            role_name="admin",
            pricing_tier="team",
        )
        subscribe_user(
            db,
            user_id=user_id,
            plan_id=ENTERPRISE_PLAN_ID,
            tenant_id=tenant_id,
        )

    client.headers.update(auth_headers(api_key=api_key_plaintext, project_id=project_id))
    response = client.post(
        "/v1/members",
        json={"email": "enterprise-invite@example.com", "name": "Enterprise Invite", "role": "viewer"},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["email"] == "enterprise-invite@example.com"
    assert payload["role"] == "viewer"
    assert isinstance(payload.get("api_key"), str)
    assert payload["api_key"].startswith("cl_")


def test_invite_member_blocks_pro_plan(
    members_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, testing_session_local = members_test_context
    with testing_session_local() as db:
        tenant_id, project_id, user_id, _, api_key_plaintext = seed_project_membership_api_key(
            db,
            role_name="admin",
            pricing_tier="team",
        )
        subscribe_user(
            db,
            user_id=user_id,
            plan_id=PRO_PLAN_ID,
            tenant_id=tenant_id,
        )

    client.headers.update(auth_headers(api_key=api_key_plaintext, project_id=project_id))
    response = client.post(
        "/v1/members",
        json={"email": "pro-invite@example.com", "role": "developer"},
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Upgrade to Team or Enterprise to invite members."}
