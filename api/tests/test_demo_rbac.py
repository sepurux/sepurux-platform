from __future__ import annotations

from collections.abc import Generator
from uuid import UUID, uuid4

import pytest
from app.auth import hash_api_key
from app.db import get_db
from app.main import app
from app.models import (
    ApiKey,
    Base,
    Campaign,
    MutationPack,
    Project,
    ProjectMembership,
    ReplayAttempt,
    Role,
    Run,
    Tenant,
    Trace,
    User,
)
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import auth_headers


@pytest.fixture()
def rbac_test_context() -> Generator[tuple[TestClient, sessionmaker[Session], UUID], None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    tenant_id = uuid4()
    project_id = uuid4()
    viewer_user_id = uuid4()
    viewer_api_key_id = uuid4()
    rate_limited_api_key_id = uuid4()
    role_viewer_id = uuid4()

    with testing_session_local() as db:
        db.add(Tenant(tenant_id=tenant_id, name="RBAC Tenant"))
        db.add(
            Project(
                project_id=project_id,
                tenant_id=tenant_id,
                name="RBAC Project",
            )
        )
        db.add(Role(role_id=role_viewer_id, name="viewer"))
        db.add(User(user_id=viewer_user_id, email="viewer@example.com"))
        db.add(
            ProjectMembership(
                user_id=viewer_user_id,
                project_id=project_id,
                role_id=role_viewer_id,
            )
        )
        db.add(
            ApiKey(
                api_key_id=viewer_api_key_id,
                tenant_id=tenant_id,
                project_id=project_id,
                user_id=viewer_user_id,
                name="viewer-key",
                key_hash=hash_api_key("viewer-key"),
            )
        )
        db.add(
            ApiKey(
                api_key_id=rate_limited_api_key_id,
                tenant_id=tenant_id,
                name="rate-limit-key",
                key_hash=hash_api_key("rate-limit-key"),
                rate_limit_per_minute=1,
            )
        )
        db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.state.auth_session_factory = testing_session_local

    with TestClient(app) as client:
        yield client, testing_session_local, project_id

    app.dependency_overrides.clear()
    if hasattr(app.state, "auth_session_factory"):
        delattr(app.state, "auth_session_factory")
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_demo_info_public_endpoint() -> None:
    with TestClient(app) as client:
        response = client.get("/demo/info")
    assert response.status_code == 200
    payload = response.json()
    assert payload["demo_api_key"] == "demo_sepurux_key"
    assert payload["demo_campaign"] == "demo_campaign"


def test_demo_session_returns_project_scoped_key(
    rbac_test_context: tuple[TestClient, sessionmaker[Session], UUID],
) -> None:
    client, session_factory, _ = rbac_test_context
    demo_tenant_id = uuid4()
    demo_project_id = uuid4()
    demo_owner_id = uuid4()
    with session_factory() as db:
        db.add(Tenant(tenant_id=demo_tenant_id, name="Demo Tenant"))
        db.add(User(user_id=demo_owner_id, email="demo-owner@example.com"))
        db.add(
            Project(
                project_id=demo_project_id,
                tenant_id=demo_tenant_id,
                owner_id=demo_owner_id,
                name="Sepurux Demo Project",
            )
        )
        db.commit()

    response = client.post("/demo/session")
    assert response.status_code == 201
    payload = response.json()

    assert payload["project_name"] == "Sepurux Demo Project"
    assert payload["demo_campaign"] == "demo_campaign"
    assert payload["api_key"].startswith("cl_")
    assert payload["project_id"] == str(demo_project_id)

    session_response = client.get(
        "/v1/auth/session",
        headers=auth_headers(api_key=payload["api_key"], project_id=demo_project_id),
    )
    assert session_response.status_code == 200
    session_payload = session_response.json()
    assert session_payload["pricing_tier"] == "enterprise"
    assert "audit" in session_payload["permissions"]["visible_sections"]

    with session_factory() as db:
        record = db.scalar(
            select(ApiKey).where(ApiKey.key_hash == hash_api_key(payload["api_key"]))
        )
        assert isinstance(record, ApiKey)
        assert record.is_demo is True
        assert record.project_id == demo_project_id
        assert record.tenant_id == demo_tenant_id

        demo_pack = db.scalar(
            select(MutationPack).where(
                MutationPack.project_id == demo_project_id,
                MutationPack.name == "core.reliability",
            )
        )
        assert isinstance(demo_pack, MutationPack)

        demo_campaign = db.scalar(
            select(Campaign).where(
                Campaign.project_id == demo_project_id,
                Campaign.name == "demo_campaign",
            )
        )
        assert isinstance(demo_campaign, Campaign)
        assert demo_campaign.mutation_pack_id == demo_pack.mutation_pack_id

        trace_count = db.scalar(
            select(func.count())
            .select_from(Trace)
            .where(
                Trace.project_id == demo_project_id,
                Trace.source == "demo.seed",
            )
        )
        assert int(trace_count or 0) >= 1

        run_count = db.scalar(
            select(func.count())
            .select_from(Run)
            .where(
                Run.project_id == demo_project_id,
                Run.campaign_id == demo_campaign.campaign_id,
            )
        )
        assert int(run_count or 0) >= 1

        attempts_count = db.scalar(
            select(func.count())
            .select_from(ReplayAttempt)
            .where(ReplayAttempt.project_id == demo_project_id)
        )
        assert int(attempts_count or 0) >= 1


def test_viewer_role_cannot_create_campaign(
    rbac_test_context: tuple[TestClient, sessionmaker[Session], UUID],
) -> None:
    client, _, project_id = rbac_test_context
    client.headers.update(auth_headers(api_key="viewer-key", project_id=project_id))
    response = client.post(
        "/v1/campaigns",
        json={
            "name": "Blocked Campaign",
            "mutation_set": [{"mutation_id": "baseline"}],
            "eval_set": {"checks": []},
        },
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "developer role required"


def test_api_key_rate_limit_enforced(
    rbac_test_context: tuple[TestClient, sessionmaker[Session], UUID],
) -> None:
    client, _, project_id = rbac_test_context
    client.headers.update(auth_headers(api_key="rate-limit-key", project_id=project_id))

    first = client.get("/v1/projects")
    second = client.get("/v1/projects")

    assert first.status_code == 200
    assert second.status_code == 429
    assert second.json()["detail"] == "API key rate limit exceeded"
