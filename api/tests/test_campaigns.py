from __future__ import annotations

from collections.abc import Generator
from uuid import UUID, uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import Base, MutationPack
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


def test_delete_campaign_archives_and_hides_by_default(
    campaign_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, _ = campaign_test_context
    create_response = client.post(
        "/v1/campaigns",
        json={
            "name": "Archive Candidate",
            "mutation_set": [{"mutation_id": "archive-me"}],
            "eval_set": {"checks": ["status"]},
        },
    )
    assert create_response.status_code == 201
    campaign_id = create_response.json()["campaign_id"]

    delete_response = client.delete(f"/v1/campaigns/{campaign_id}")
    assert delete_response.status_code == 204

    hidden_get = client.get(f"/v1/campaigns/{campaign_id}")
    assert hidden_get.status_code == 404

    hidden_list = client.get("/v1/campaigns?limit=10&offset=0")
    assert hidden_list.status_code == 200
    assert campaign_id not in {item["campaign_id"] for item in hidden_list.json()}

    visible_get = client.get(f"/v1/campaigns/{campaign_id}?include_archived=true")
    assert visible_get.status_code == 200
    assert visible_get.json()["status"] == "archived"

    visible_list = client.get("/v1/campaigns?limit=10&offset=0&include_archived=true")
    assert visible_list.status_code == 200
    assert campaign_id in {item["campaign_id"] for item in visible_list.json()}


def test_post_campaign_rejects_pack_definition_mutation_set_when_pack_attached(
    campaign_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, testing_session_local = campaign_test_context
    mutation_pack_id = uuid4()

    with testing_session_local() as db:
        project_id = UUID(client.headers["X-Project-Id"])
        db.add(
            MutationPack(
                mutation_pack_id=mutation_pack_id,
                project_id=project_id,
                name="Fault Pack",
                description="Timeout and schema chaos",
                config={
                    "max_mutations_per_attempt": 1,
                    "mutations": [
                        {
                            "mutation_id": "timeout-jira",
                            "type": "fault.timeout",
                            "target": {"tool": "jira.*"},
                            "params": {"prob": 1.0, "timeout_ms": 3000},
                            "probability": 1.0,
                            "weight": 1.0,
                        }
                    ],
                },
            )
        )
        db.commit()

    response = client.post(
        "/v1/campaigns",
        json={
            "name": "Pack-backed Campaign",
            "mutation_pack_id": str(mutation_pack_id),
            "mutation_set": [
                {
                    "mutation_id": "timeout-jira",
                    "type": "fault.timeout",
                    "target": {"tool": "jira.*"},
                    "params": {"prob": 1.0, "timeout_ms": 3000},
                    "probability": 1.0,
                    "weight": 1.0,
                }
            ],
            "eval_set": {"checks": ["status"]},
        },
    )

    assert response.status_code == 422
    assert response.json() == {
        "detail": (
            "Campaign mutation_set must contain replay mutations, not mutation-pack " "definitions"
        )
    }


def test_campaign_create_rejects_non_list_mutation_set(
    campaign_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    """mutation_set must be a list; non-list values should be rejected with 422."""
    client, _ = campaign_test_context

    for bad_mutation_set in [None, "baseline", 42, {"mutation_id": "baseline"}]:
        response = client.post(
            "/v1/campaigns",
            json={
                "name": "Bad Mutation Set",
                "mutation_set": bad_mutation_set,
                "eval_set": {"checks": ["status"]},
            },
        )
        assert response.status_code == 422, f"Expected 422 for mutation_set={bad_mutation_set!r}"


def test_campaign_create_rejects_non_dict_eval_set(
    campaign_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    """eval_set must be a dict; non-dict values should be rejected with 422."""
    client, _ = campaign_test_context

    for bad_eval_set in [None, "status", 42, ["status"]]:
        response = client.post(
            "/v1/campaigns",
            json={
                "name": "Bad Eval Set",
                "mutation_set": [{"mutation_id": "baseline"}],
                "eval_set": bad_eval_set,
            },
        )
        assert response.status_code == 422, f"Expected 422 for eval_set={bad_eval_set!r}"


def test_patch_campaign_mutation_set_updates_campaign(
    campaign_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, _ = campaign_test_context
    create_response = client.post(
        "/v1/campaigns",
        json={
            "name": "Editable Mutations",
            "mutation_set": [{"mutation_id": "baseline.refund", "tool": "payments.refund", "args": {}}],
            "eval_set": {"checks": ["status"]},
        },
    )
    assert create_response.status_code == 201
    campaign_id = create_response.json()["campaign_id"]

    patch_response = client.patch(
        f"/v1/campaigns/{campaign_id}/mutation-set",
        json={
            "mutation_set": [
                {
                    "mutation_id": "baseline.refund",
                    "tool": "payments.refund",
                    "args": {"confirmation_token": "approved"},
                }
            ]
        },
    )
    assert patch_response.status_code == 200
    payload = patch_response.json()
    assert payload["campaign_id"] == campaign_id
    assert payload["mutation_set"] == [
        {
            "mutation_id": "baseline.refund",
            "tool": "payments.refund",
            "args": {"confirmation_token": "approved"},
        }
    ]


def test_patch_campaign_mutation_set_returns_404_for_missing_campaign(
    campaign_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, _ = campaign_test_context
    response = client.patch(
        f"/v1/campaigns/{uuid4()}/mutation-set",
        json={"mutation_set": [{"mutation_id": "baseline"}]},
    )
    assert response.status_code == 404
    assert response.json() == {"detail": "Campaign not found"}


def test_patch_campaign_eval_set_updates_attempts_count(
    campaign_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, _ = campaign_test_context
    create_response = client.post(
        "/v1/campaigns",
        json={
            "name": "Attempt Tunable",
            "mutation_set": [{"mutation_id": "baseline"}],
            "eval_set": {"checks": ["status"], "attempts_count": 10},
        },
    )
    assert create_response.status_code == 201
    campaign_id = create_response.json()["campaign_id"]

    patch_response = client.patch(
        f"/v1/campaigns/{campaign_id}/eval-set",
        json={"attempts_count": 37},
    )
    assert patch_response.status_code == 200
    payload = patch_response.json()
    assert payload["campaign_id"] == campaign_id
    assert payload["eval_set"]["attempts_count"] == 37


def test_patch_campaign_mutation_pack_updates_campaign(
    campaign_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, testing_session_local = campaign_test_context
    create_response = client.post(
        "/v1/campaigns",
        json={
            "name": "Pack Mutable Campaign",
            "mutation_set": [{"mutation_id": "baseline"}],
            "eval_set": {"checks": ["status"]},
        },
    )
    assert create_response.status_code == 201
    campaign_id = create_response.json()["campaign_id"]

    mutation_pack_id = uuid4()
    with testing_session_local() as db:
        project_id = UUID(client.headers["X-Project-Id"])
        db.add(
            MutationPack(
                mutation_pack_id=mutation_pack_id,
                project_id=project_id,
                name="pack.mutable",
                description="test pack",
                config={"mutations": []},
            )
        )
        db.commit()

    patch_response = client.patch(
        f"/v1/campaigns/{campaign_id}/mutation-pack",
        json={"mutation_pack_id": str(mutation_pack_id)},
    )
    assert patch_response.status_code == 200
    payload = patch_response.json()
    assert payload["campaign_id"] == campaign_id
    assert payload["mutation_pack_id"] == str(mutation_pack_id)
