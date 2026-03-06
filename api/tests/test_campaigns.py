from __future__ import annotations

from collections.abc import Generator
from uuid import UUID, uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import Base
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import auth_headers, seed_tenant_project_and_key


@pytest.fixture()
def campaign_test_context() -> Generator[tuple[TestClient, sessionmaker[Session]], None, None]:
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
        yield client, testing_session_local

    app.dependency_overrides.clear()
    if hasattr(app.state, "auth_session_factory"):
        delattr(app.state, "auth_session_factory")
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_post_and_get_campaign(
    campaign_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, _ = campaign_test_context
    payload = {
        "name": "Baseline Campaign",
        "mutation_set": [{"type": "swap-bytes"}],
        "eval_set": {"checks": ["exit_code", "stderr"]},
    }

    create_response = client.post("/v1/campaigns", json=payload)

    assert create_response.status_code == 201
    created = create_response.json()
    campaign_id = UUID(created["campaign_id"])
    assert created["name"] == payload["name"]
    assert created["mutation_set"] == payload["mutation_set"]
    assert created["eval_set"] == payload["eval_set"]
    assert created["created_at"]

    get_response = client.get(f"/v1/campaigns/{campaign_id}")

    assert get_response.status_code == 200
    fetched = get_response.json()
    assert fetched == created


def test_get_campaign_returns_404_when_missing(
    campaign_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, _ = campaign_test_context

    response = client.get(f"/v1/campaigns/{uuid4()}")

    assert response.status_code == 404
    assert response.json() == {"detail": "Campaign not found"}


def test_list_campaigns_returns_records(
    campaign_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, _ = campaign_test_context
    payload_one = {
        "name": "Campaign One",
        "mutation_set": [{"mutation_id": "one"}],
        "eval_set": {"checks": ["status"]},
    }
    payload_two = {
        "name": "Campaign Two",
        "mutation_set": [{"mutation_id": "two"}],
        "eval_set": {"checks": ["status"]},
    }
    first = client.post("/v1/campaigns", json=payload_one)
    second = client.post("/v1/campaigns", json=payload_two)
    assert first.status_code == 201
    assert second.status_code == 201

    response = client.get("/v1/campaigns?limit=10&offset=0")

    assert response.status_code == 200
    records = response.json()
    names = [record["name"] for record in records]
    assert "Campaign One" in names
    assert "Campaign Two" in names
