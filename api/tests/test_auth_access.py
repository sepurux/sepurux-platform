from __future__ import annotations

from collections.abc import Generator
from urllib.parse import parse_qs, urlparse
from uuid import UUID, uuid4

import pytest
from app.auth import hash_api_key
from app.db import get_db
from app.main import app
from app.models import (
    ApiKey,
    Base,
    InternalFeatureFlag,
    PasswordResetToken,
    Project,
    ProjectMembership,
    Role,
    Tenant,
    User,
    UserIdentity,
    WaitlistEntry,
)
from app.services.auth_service import hash_password, verify_password
from app.services.billing_service import PRO_PLAN_ID, subscribe_user
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
    assert payload["pricing_tier"] == "credits"
    assert payload["plan_name"] == "Free"
    assert payload["role_name"] == "member"
    assert payload["is_super_admin"] is False
    assert payload["permissions"]["can_manage_api_keys"] is True
    assert payload["permissions"]["can_manage_billing"] is True
    assert "audit" not in payload["permissions"]["visible_sections"]
    assert payload["billing_plan_name"] == "Free"
    assert payload["credits_balance"] == 100
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
    assert session_payload["pricing_tier"] == "credits"
    assert session_payload["role_name"] == "member"
    assert session_payload["is_super_admin"] is False
    assert session_payload["permissions"]["can_manage_workspace"] is False


def test_signup_with_starter_plan_still_gets_full_access(
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

    assert payload["pricing_tier"] == "credits"
    assert payload["plan_name"] == "Free"
    assert "billing" in payload["permissions"]["visible_sections"]
    assert "mutation-packs" in payload["permissions"]["visible_sections"]
    assert "policies" not in payload["permissions"]["visible_sections"]
    assert "security" not in payload["permissions"]["visible_sections"]
    assert "webhooks" not in payload["permissions"]["visible_sections"]
    assert "audit" not in payload["permissions"]["visible_sections"]
    assert payload["permissions"]["can_manage_policy_packs"] is False
    assert payload["permissions"]["can_manage_security_config"] is False
    assert payload["permissions"]["can_manage_workspace"] is False


def test_signup_is_blocked_when_registration_is_disabled(
    auth_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = auth_test_context

    with session_factory() as db:
        db.add(InternalFeatureFlag(key="enable_registration", enabled=False))
        db.commit()

    response = client.post(
        "/auth/signup",
        json={
            "email": "blocked@example.com",
            "password": "blocked-pass-123",
        },
    )
    assert response.status_code == 403
    assert response.json() == {
        "detail": "Registration is currently disabled. Join the waitlist for access."
    }


def test_signup_is_allowed_for_approved_waitlist_email_when_registration_is_disabled(
    auth_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = auth_test_context

    with session_factory() as db:
        db.add(InternalFeatureFlag(key="enable_registration", enabled=False))
        db.add(
            WaitlistEntry(
                waitlist_entry_id=uuid4(),
                email="approved@example.com",
                role="Platform Eng",
                company="Acme",
                status="approved",
                source="site",
            )
        )
        db.commit()

    response = client.post(
        "/auth/signup",
        json={
            "email": "approved@example.com",
            "password": "approved-pass-123",
            "name": "Approved User",
        },
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["email"] == "approved@example.com"


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
    assert payload["pricing_tier"] == "credits"
    assert payload["plan_name"] == "Team"
    assert payload["role_name"] == "member"
    assert payload["is_super_admin"] is False
    assert payload["permissions"]["can_run_campaigns"] is True
    assert payload["permissions"]["can_manage_mutation_packs"] is True
    assert payload["permissions"]["can_manage_policy_packs"] is True
    assert payload["permissions"]["can_manage_security_config"] is True
    assert payload["permissions"]["can_manage_workspace"] is False
    assert payload["permissions"]["can_manage_api_keys"] is True
    assert payload["permissions"]["can_manage_billing"] is True
    assert "campaigns" in payload["permissions"]["visible_sections"]
    assert "webhooks" in payload["permissions"]["visible_sections"]
    assert "audit" not in payload["permissions"]["visible_sections"]


def test_login_with_pro_subscription_gets_policy_security_without_team_sections(
    auth_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = auth_test_context
    tenant_id = uuid4()
    user_id = uuid4()
    project_id = uuid4()
    role_id = uuid4()

    with session_factory() as db:
        db.add(Tenant(tenant_id=tenant_id, name="Pro Tenant", pricing_tier="team"))
        db.add(Role(role_id=role_id, name="admin"))
        db.add(
            User(
                user_id=user_id,
                email="pro-user@example.com",
                name="Pro User",
                password_hash=hash_password("pro-secret-123"),
            )
        )
        db.add(
            Project(
                project_id=project_id,
                tenant_id=tenant_id,
                owner_id=user_id,
                name="Pro Project",
            )
        )
        db.add(ProjectMembership(user_id=user_id, project_id=project_id, role_id=role_id))
        db.flush()
        subscribe_user(
            db,
            user_id=user_id,
            plan_id=PRO_PLAN_ID,
            tenant_id=tenant_id,
        )
        db.commit()

    response = client.post(
        "/auth/login",
        json={"email": "pro-user@example.com", "password": "pro-secret-123"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["plan_name"] == "Pro"
    assert payload["permissions"]["can_manage_policy_packs"] is True
    assert payload["permissions"]["can_manage_security_config"] is True
    assert payload["permissions"]["can_manage_workspace"] is False
    assert "policies" in payload["permissions"]["visible_sections"]
    assert "security" in payload["permissions"]["visible_sections"]
    assert "webhooks" not in payload["permissions"]["visible_sections"]
    assert "audit" not in payload["permissions"]["visible_sections"]


def test_viewer_login_still_gets_full_workspace_access(
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
    assert payload["pricing_tier"] == "credits"
    assert payload["role_name"] == "member"
    assert payload["is_super_admin"] is False
    assert "audit" not in payload["permissions"]["visible_sections"]
    assert payload["permissions"]["can_upload_traces"] is True
    assert payload["permissions"]["can_create_campaigns"] is True
    assert payload["permissions"]["can_manage_mutation_packs"] is True
    assert payload["permissions"]["can_manage_policy_packs"] is False
    assert payload["permissions"]["can_manage_security_config"] is False
    assert payload["permissions"]["can_manage_workspace"] is False
    assert payload["permissions"]["can_manage_billing"] is True


class _MockHttpResponse:
    def __init__(self, status_code: int, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


def test_github_oauth_bootstraps_workspace_and_exchanges_session(
    auth_test_context: tuple[TestClient, sessionmaker[Session]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, session_factory = auth_test_context

    monkeypatch.setenv("GITHUB_CLIENT_ID", "github-client")
    monkeypatch.setenv("GITHUB_CLIENT_SECRET", "github-secret")
    monkeypatch.setenv("SEPURUX_UI_BASE_URL", "http://localhost:3000")

    def fake_post(url: str, data=None, headers=None, timeout=None):
        assert "github.com/login/oauth/access_token" in url
        assert data["client_id"] == "github-client"
        return _MockHttpResponse(200, {"access_token": "gh-access-token"})

    def fake_get(url: str, headers=None, timeout=None):
        if url.endswith("/user"):
            return _MockHttpResponse(200, {"id": 4242, "name": "Octo Dev"})
        if url.endswith("/user/emails"):
            return _MockHttpResponse(
                200,
                [
                    {
                        "email": "octo@example.com",
                        "primary": True,
                        "verified": True,
                    }
                ],
            )
        raise AssertionError(f"Unexpected OAuth GET URL: {url}")

    monkeypatch.setattr("app.services.oauth_service.httpx.post", fake_post)
    monkeypatch.setattr("app.services.oauth_service.httpx.get", fake_get)

    start_response = client.get(
        "/auth/oauth/github/start",
        params={"next": "/dashboard"},
        follow_redirects=False,
    )
    assert start_response.status_code == 302
    start_location = start_response.headers["location"]
    assert start_location.startswith("https://github.com/login/oauth/authorize?")
    state = parse_qs(urlparse(start_location).query)["state"][0]

    callback_response = client.get(
        "/auth/oauth/github/callback",
        params={"state": state, "code": "oauth-code"},
        follow_redirects=False,
    )
    assert callback_response.status_code == 303
    callback_location = callback_response.headers["location"]
    assert callback_location.startswith("http://localhost:3000/auth?")
    exchange_token = parse_qs(urlparse(callback_location).query)["exchange"][0]

    exchange_response = client.post(
        "/auth/oauth/exchange",
        json={"token": exchange_token},
    )
    assert exchange_response.status_code == 200
    payload = exchange_response.json()
    assert payload["email"] == "octo@example.com"
    assert payload["name"] == "Octo Dev"
    assert payload["role_name"] == "member"
    assert payload["is_super_admin"] is False
    assert payload["pricing_tier"] == "credits"
    assert payload["api_key"].startswith("cl_")

    with session_factory() as db:
        user = db.scalar(select(User).where(User.email == "octo@example.com"))
        assert isinstance(user, User)
        identity = db.scalar(
            select(UserIdentity).where(
                UserIdentity.provider == "github",
                UserIdentity.provider_user_id == "4242",
            )
        )
        assert isinstance(identity, UserIdentity)
        assert identity.user_id == user.user_id


def test_github_oauth_new_user_is_blocked_when_registration_is_disabled(
    auth_test_context: tuple[TestClient, sessionmaker[Session]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, session_factory = auth_test_context

    with session_factory() as db:
        db.add(InternalFeatureFlag(key="enable_registration", enabled=False))
        db.commit()

    monkeypatch.setenv("GITHUB_CLIENT_ID", "github-client")
    monkeypatch.setenv("GITHUB_CLIENT_SECRET", "github-secret")
    monkeypatch.setenv("SEPURUX_UI_BASE_URL", "http://localhost:3000")

    def fake_post(url: str, data=None, headers=None, timeout=None):
        assert "github.com/login/oauth/access_token" in url
        return _MockHttpResponse(200, {"access_token": "gh-access-token"})

    def fake_get(url: str, headers=None, timeout=None):
        if url.endswith("/user"):
            return _MockHttpResponse(200, {"id": 9999, "name": "Blocked OAuth"})
        if url.endswith("/user/emails"):
            return _MockHttpResponse(
                200,
                [
                    {
                        "email": "blocked-oauth@example.com",
                        "primary": True,
                        "verified": True,
                    }
                ],
            )
        raise AssertionError(f"Unexpected OAuth GET URL: {url}")

    monkeypatch.setattr("app.services.oauth_service.httpx.post", fake_post)
    monkeypatch.setattr("app.services.oauth_service.httpx.get", fake_get)

    start_response = client.get(
        "/auth/oauth/github/start",
        params={"next": "/dashboard"},
        follow_redirects=False,
    )
    assert start_response.status_code == 302
    state = parse_qs(urlparse(start_response.headers["location"]).query)["state"][0]

    callback_response = client.get(
        "/auth/oauth/github/callback",
        params={"state": state, "code": "oauth-code"},
        follow_redirects=False,
    )
    assert callback_response.status_code == 303
    query = parse_qs(urlparse(callback_response.headers["location"]).query)
    assert query["oauth_error"] == ["Registration is currently disabled. Join the waitlist for access."]
    assert "exchange" not in query

    with session_factory() as db:
        user = db.scalar(select(User).where(User.email == "blocked-oauth@example.com"))
        assert user is None


def test_github_oauth_new_user_is_allowed_for_approved_waitlist_email_when_registration_is_disabled(
    auth_test_context: tuple[TestClient, sessionmaker[Session]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, session_factory = auth_test_context

    with session_factory() as db:
        db.add(InternalFeatureFlag(key="enable_registration", enabled=False))
        db.add(
            WaitlistEntry(
                waitlist_entry_id=uuid4(),
                email="approved-oauth@example.com",
                role="Security",
                company="Acme",
                status="approved",
                source="site",
            )
        )
        db.commit()

    monkeypatch.setenv("GITHUB_CLIENT_ID", "github-client")
    monkeypatch.setenv("GITHUB_CLIENT_SECRET", "github-secret")
    monkeypatch.setenv("SEPURUX_UI_BASE_URL", "http://localhost:3000")

    def fake_post(url: str, data=None, headers=None, timeout=None):
        assert "github.com/login/oauth/access_token" in url
        return _MockHttpResponse(200, {"access_token": "gh-access-token"})

    def fake_get(url: str, headers=None, timeout=None):
        if url.endswith("/user"):
            return _MockHttpResponse(200, {"id": 7777, "name": "Approved OAuth"})
        if url.endswith("/user/emails"):
            return _MockHttpResponse(
                200,
                [
                    {
                        "email": "approved-oauth@example.com",
                        "primary": True,
                        "verified": True,
                    }
                ],
            )
        raise AssertionError(f"Unexpected OAuth GET URL: {url}")

    monkeypatch.setattr("app.services.oauth_service.httpx.post", fake_post)
    monkeypatch.setattr("app.services.oauth_service.httpx.get", fake_get)

    start_response = client.get(
        "/auth/oauth/github/start",
        params={"next": "/dashboard"},
        follow_redirects=False,
    )
    assert start_response.status_code == 302
    state = parse_qs(urlparse(start_response.headers["location"]).query)["state"][0]

    callback_response = client.get(
        "/auth/oauth/github/callback",
        params={"state": state, "code": "oauth-code"},
        follow_redirects=False,
    )
    assert callback_response.status_code == 303
    query = parse_qs(urlparse(callback_response.headers["location"]).query)
    assert "exchange" in query
    assert "oauth_error" not in query

    exchange_response = client.post(
        "/auth/oauth/exchange",
        json={"token": query["exchange"][0]},
    )
    assert exchange_response.status_code == 200
    payload = exchange_response.json()
    assert payload["email"] == "approved-oauth@example.com"


def test_super_admin_login_sets_internal_session_flag(
    auth_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = auth_test_context
    tenant_id = uuid4()
    user_id = uuid4()
    project_id = uuid4()
    role_id = uuid4()

    with session_factory() as db:
        db.add(Tenant(tenant_id=tenant_id, name="Sepurux Team", pricing_tier="enterprise"))
        db.add(Role(role_id=role_id, name="super_admin"))
        db.add(
            User(
                user_id=user_id,
                email="ops@sepurux.com",
                name="Sepurux Ops",
                password_hash=hash_password("ops-pass-123"),
            )
        )
        db.add(
            Project(
                project_id=project_id,
                tenant_id=tenant_id,
                owner_id=user_id,
                name="Internal Control",
            )
        )
        db.add(ProjectMembership(user_id=user_id, project_id=project_id, role_id=role_id))
        db.commit()

    response = client.post(
        "/auth/login",
        json={"email": "ops@sepurux.com", "password": "ops-pass-123"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["role_name"] == "member"
    assert payload["is_super_admin"] is True


def test_google_oauth_links_existing_user_by_verified_email(
    auth_test_context: tuple[TestClient, sessionmaker[Session]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, session_factory = auth_test_context
    tenant_id = uuid4()
    user_id = uuid4()
    project_id = uuid4()
    role_id = uuid4()

    with session_factory() as db:
        db.add(Tenant(tenant_id=tenant_id, name="Existing Tenant", pricing_tier="team"))
        db.add(Role(role_id=role_id, name="admin"))
        db.add(
            User(
                user_id=user_id,
                email="founder@example.com",
                name="Founding User",
                password_hash=hash_password("super-secret-123"),
            )
        )
        db.add(
            Project(
                project_id=project_id,
                tenant_id=tenant_id,
                owner_id=user_id,
                name="Existing Project",
            )
        )
        db.add(ProjectMembership(user_id=user_id, project_id=project_id, role_id=role_id))
        db.commit()

    monkeypatch.setenv("GOOGLE_CLIENT_ID", "google-client")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "google-secret")
    monkeypatch.setenv("SEPURUX_UI_BASE_URL", "http://localhost:3000")

    def fake_post(url: str, data=None, headers=None, timeout=None):
        assert "oauth2.googleapis.com/token" in url
        return _MockHttpResponse(200, {"access_token": "google-access-token"})

    def fake_get(url: str, headers=None, timeout=None):
        assert url == "https://openidconnect.googleapis.com/v1/userinfo"
        return _MockHttpResponse(
            200,
            {
                "sub": "google-user-123",
                "email": "founder@example.com",
                "email_verified": True,
                "name": "Founding User",
            },
        )

    monkeypatch.setattr("app.services.oauth_service.httpx.post", fake_post)
    monkeypatch.setattr("app.services.oauth_service.httpx.get", fake_get)

    start_response = client.get(
        "/auth/oauth/google/start",
        params={"next": "/campaigns"},
        follow_redirects=False,
    )
    assert start_response.status_code == 302
    state = parse_qs(urlparse(start_response.headers["location"]).query)["state"][0]

    callback_response = client.get(
        "/auth/oauth/google/callback",
        params={"state": state, "code": "oauth-code"},
        follow_redirects=False,
    )
    exchange_token = parse_qs(urlparse(callback_response.headers["location"]).query)["exchange"][0]

    exchange_response = client.post(
        "/auth/oauth/exchange",
        json={"token": exchange_token},
    )
    assert exchange_response.status_code == 200
    payload = exchange_response.json()
    assert payload["email"] == "founder@example.com"
    assert payload["project_id"] == str(project_id)

    with session_factory() as db:
        users = list(db.scalars(select(User).where(User.email == "founder@example.com")))
        assert len(users) == 1
        identity = db.scalar(
            select(UserIdentity).where(
                UserIdentity.provider == "google",
                UserIdentity.provider_user_id == "google-user-123",
            )
        )
        assert isinstance(identity, UserIdentity)
        assert identity.user_id == user_id


def test_forgot_password_creates_reset_token_without_leaking_account_existence(
    auth_test_context: tuple[TestClient, sessionmaker[Session]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, session_factory = auth_test_context

    captured: dict[str, str] = {}

    def fake_send_password_reset_email(**kwargs):
        captured["token"] = kwargs["reset_token"]
        captured["email"] = kwargs["to_email"]
        return True

    monkeypatch.setattr(
        "app.services.auth_service.send_password_reset_email",
        fake_send_password_reset_email,
    )

    with session_factory() as db:
        db.add(
            User(
                user_id=uuid4(),
                email="resettable@example.com",
                name="Reset Table",
                password_hash=hash_password("old-pass-123"),
            )
        )
        db.commit()

    response_existing = client.post(
        "/auth/forgot-password",
        json={"email": "resettable@example.com"},
    )
    assert response_existing.status_code == 200
    assert response_existing.json()["message"].startswith("If an account exists")
    assert captured["email"] == "resettable@example.com"
    assert len(captured["token"]) >= 20

    response_unknown = client.post(
        "/auth/forgot-password",
        json={"email": "unknown@example.com"},
    )
    assert response_unknown.status_code == 200
    assert response_unknown.json() == response_existing.json()

    with session_factory() as db:
        user = db.scalar(select(User).where(User.email == "resettable@example.com"))
        assert isinstance(user, User)
        tokens = list(
            db.scalars(select(PasswordResetToken).where(PasswordResetToken.user_id == user.user_id))
        )
        assert len(tokens) == 1
        assert tokens[0].consumed_at is None


def test_reset_password_with_token_updates_credentials(
    auth_test_context: tuple[TestClient, sessionmaker[Session]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, session_factory = auth_test_context

    captured: dict[str, str] = {}

    def fake_send_password_reset_email(**kwargs):
        captured["token"] = kwargs["reset_token"]
        return True

    monkeypatch.setattr(
        "app.services.auth_service.send_password_reset_email",
        fake_send_password_reset_email,
    )
    monkeypatch.setattr(
        "app.services.auth_service.send_password_changed_email",
        lambda **_kwargs: True,
    )

    with session_factory() as db:
        db.add(
            User(
                user_id=uuid4(),
                email="recover@example.com",
                name="Recover User",
                password_hash=hash_password("old-pass-123"),
            )
        )
        db.commit()

    forgot_response = client.post(
        "/auth/forgot-password",
        json={"email": "recover@example.com"},
    )
    assert forgot_response.status_code == 200
    reset_token = captured["token"]

    reset_response = client.post(
        "/auth/reset-password",
        json={"token": reset_token, "password": "new-pass-456"},
    )
    assert reset_response.status_code == 200
    assert reset_response.json()["message"] == "Password has been reset successfully."

    with session_factory() as db:
        user = db.scalar(select(User).where(User.email == "recover@example.com"))
        assert isinstance(user, User)
        assert verify_password("new-pass-456", user.password_hash)
        assert not verify_password("old-pass-123", user.password_hash)

    second_reset = client.post(
        "/auth/reset-password",
        json={"token": reset_token, "password": "another-pass-789"},
    )
    assert second_reset.status_code == 400
