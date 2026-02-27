from __future__ import annotations

from collections.abc import Generator
from uuid import UUID, uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import Base, Campaign, MutationPack, Project, Trace
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import auth_headers, seed_tenant_project_and_key


class FakeQueue:
    def __init__(self) -> None:
        self.calls: list[tuple[tuple[object, ...], dict[str, object]]] = []

    def enqueue(self, *args: object, **kwargs: object) -> object:
        self.calls.append((args, kwargs))
        return {"queued": True}


@pytest.fixture()
def mutation_pack_test_context(
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[tuple[TestClient, sessionmaker[Session], UUID, FakeQueue], None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    with testing_session_local() as db:
        _, project_id, _, api_key_plaintext = seed_tenant_project_and_key(db)

    fake_queue = FakeQueue()
    monkeypatch.setattr("app.services.run_service.get_run_queue", lambda: fake_queue)

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
        yield client, testing_session_local, project_id, fake_queue

    app.dependency_overrides.clear()
    if hasattr(app.state, "auth_session_factory"):
        delattr(app.state, "auth_session_factory")
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_mutation_pack_crud_is_project_scoped(
    mutation_pack_test_context: tuple[TestClient, sessionmaker[Session], UUID, FakeQueue],
) -> None:
    client, testing_session_local, project_id, _ = mutation_pack_test_context
    other_project_id = uuid4()
    other_pack_id = uuid4()

    create_response = client.post(
        "/v1/mutation-packs",
        json={
            "name": "Chaos Defaults",
            "description": "Seeded test fuzzers",
            "config": {
                "max_mutations_per_attempt": 2,
                "mutations": [
                    {
                        "mutation_id": "rename-status",
                        "type": "schema.rename_field",
                        "target": {"tool": "jira.*"},
                        "params": {"from": "status", "to": "state"},
                        "probability": 1.0,
                        "weight": 1.0,
                    }
                ],
            },
        },
    )
    assert create_response.status_code == 201
    created_payload = create_response.json()
    created_pack_id = UUID(created_payload["mutation_pack_id"])
    assert created_payload["project_id"] == str(project_id)

    with testing_session_local() as db:
        current_project = db.execute(
            select(Project).where(Project.project_id == project_id)
        ).scalar_one()
        db.add(
            Project(
                project_id=other_project_id,
                tenant_id=current_project.tenant_id,
                name="Sibling Project",
            )
        )
        db.add(
            MutationPack(
                mutation_pack_id=other_pack_id,
                project_id=other_project_id,
                name="Other Project Pack",
                description=None,
                config={"mutations": []},
            )
        )
        db.commit()

    list_response = client.get("/v1/mutation-packs")
    assert list_response.status_code == 200
    listed_ids = {item["mutation_pack_id"] for item in list_response.json()}
    assert str(created_pack_id) in listed_ids
    assert str(other_pack_id) not in listed_ids

    get_created = client.get(f"/v1/mutation-packs/{created_pack_id}")
    assert get_created.status_code == 200
    assert get_created.json()["name"] == "Chaos Defaults"

    get_other = client.get(f"/v1/mutation-packs/{other_pack_id}")
    assert get_other.status_code == 404
    assert get_other.json() == {"detail": "Mutation pack not found"}


def test_campaign_can_reference_mutation_pack_and_run_create_still_queues(
    mutation_pack_test_context: tuple[TestClient, sessionmaker[Session], UUID, FakeQueue],
) -> None:
    client, testing_session_local, project_id, fake_queue = mutation_pack_test_context
    trace_id = uuid4()

    with testing_session_local() as db:
        db.add(
            Trace(
                trace_id=trace_id,
                project_id=project_id,
                source="test",
                s3_key=f"traces/{trace_id}.json",
            )
        )
        db.commit()

    pack_response = client.post(
        "/v1/mutation-packs",
        json={
            "name": "Fault Pack",
            "description": "Timeout and schema chaos",
            "config": {
                "max_mutations_per_attempt": 1,
                "mutations": [
                    {
                        "mutation_id": "timeout-jira",
                        "type": "fault.timeout",
                        "target": {"tool": "jira.*"},
                        "probability": 1.0,
                        "weight": 1.0,
                    }
                ],
            },
        },
    )
    assert pack_response.status_code == 201
    mutation_pack_id = pack_response.json()["mutation_pack_id"]

    campaign_response = client.post(
        "/v1/campaigns",
        json={
            "name": "Campaign with Pack",
            "mutation_set": [{"mutation_id": "baseline", "tool": "jira.create_issue"}],
            "eval_set": {"checks": ["status"]},
            "mutation_pack_id": mutation_pack_id,
        },
    )
    assert campaign_response.status_code == 201
    campaign_payload = campaign_response.json()
    campaign_id = UUID(campaign_payload["campaign_id"])
    assert campaign_payload["mutation_pack_id"] == mutation_pack_id

    run_response = client.post(
        "/v1/runs",
        json={"trace_id": str(trace_id), "campaign_id": str(campaign_id)},
    )
    assert run_response.status_code == 201
    run_id = UUID(run_response.json()["run_id"])
    assert fake_queue.calls == [(("worker.execute_run", str(run_id)), {})]

    missing_pack_campaign = client.post(
        "/v1/campaigns",
        json={
            "name": "Campaign missing pack",
            "mutation_set": [{"mutation_id": "baseline", "tool": "jira.create_issue"}],
            "eval_set": {"checks": ["status"]},
            "mutation_pack_id": str(uuid4()),
        },
    )
    assert missing_pack_campaign.status_code == 404
    assert missing_pack_campaign.json() == {"detail": "Mutation pack not found"}

    with testing_session_local() as db:
        campaign_row = db.execute(
            select(Campaign).where(Campaign.campaign_id == campaign_id)
        ).scalar_one()
        assert campaign_row.mutation_pack_id == UUID(mutation_pack_id)
