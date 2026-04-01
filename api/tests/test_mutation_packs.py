from __future__ import annotations

from collections.abc import Generator
from uuid import UUID, uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import Base, Campaign, MutationPack, Project, Run, Trace
from app.mutation_registry import get_registered_pack_definition
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import auth_headers, seed_project_membership_api_key, seed_tenant_project_and_key


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
    monkeypatch.setattr("app.services.trace_intake.put_json_object", lambda *args, **kwargs: None)

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
    assert created_payload["is_system"] is False
    assert isinstance(created_payload["coverage_score"], int)
    assert created_payload["warning"] == "Mutation pack may be too weak to detect failures"
    assert isinstance(created_payload["validation_issues"], list)

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


def test_system_mutation_packs_are_bootstrapped_and_cannot_be_deleted(
    mutation_pack_test_context: tuple[TestClient, sessionmaker[Session], UUID, FakeQueue],
) -> None:
    client, _, _, _ = mutation_pack_test_context

    list_response = client.get("/v1/mutation-packs")
    assert list_response.status_code == 200
    payload = list_response.json()

    system_rows = [row for row in payload if row["is_system"]]
    system_names = {row["name"] for row in system_rows}
    assert "sepurux.max_chaos" in system_names
    assert "sepurux.core.reliability" in system_names
    assert "core.reliability" in system_names
    assert "core.latency" in system_names
    assert "prompt.injection" in system_names
    assert "tool.schema.break" in system_names

    sample_system_pack_id = system_rows[0]["mutation_pack_id"]
    delete_response = client.delete(f"/v1/mutation-packs/{sample_system_pack_id}")
    assert delete_response.status_code == 403
    assert delete_response.json() == {"detail": "System mutation packs cannot be deleted"}


def test_delete_mutation_pack_archives_and_hides_by_default(
    mutation_pack_test_context: tuple[TestClient, sessionmaker[Session], UUID, FakeQueue],
) -> None:
    client, _, _, _ = mutation_pack_test_context
    create_response = client.post(
        "/v1/mutation-packs",
        json={
            "name": "Archive Mutation Pack",
            "description": "Soft delete this pack",
            "config": {"mutations": []},
        },
    )
    assert create_response.status_code == 201
    mutation_pack_id = create_response.json()["mutation_pack_id"]

    delete_response = client.delete(f"/v1/mutation-packs/{mutation_pack_id}")
    assert delete_response.status_code == 204

    hidden_get = client.get(f"/v1/mutation-packs/{mutation_pack_id}")
    assert hidden_get.status_code == 404

    hidden_list = client.get("/v1/mutation-packs")
    assert hidden_list.status_code == 200
    assert mutation_pack_id not in {item["mutation_pack_id"] for item in hidden_list.json()}

    visible_get = client.get(f"/v1/mutation-packs/{mutation_pack_id}?include_archived=true")
    assert visible_get.status_code == 200
    assert visible_get.json()["is_archived"] is True

    visible_list = client.get("/v1/mutation-packs?include_archived=true")
    assert visible_list.status_code == 200
    assert mutation_pack_id in {item["mutation_pack_id"] for item in visible_list.json()}


def test_archived_mutation_pack_cannot_be_used_for_new_runs(
    mutation_pack_test_context: tuple[TestClient, sessionmaker[Session], UUID, FakeQueue],
) -> None:
    client, testing_session_local, project_id, _ = mutation_pack_test_context
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
            "name": "Archive then run",
            "description": "Archive should block new runs",
            "config": {"mutations": []},
        },
    )
    assert pack_response.status_code == 201
    mutation_pack_id = pack_response.json()["mutation_pack_id"]

    campaign_response = client.post(
        "/v1/campaigns",
        json={
            "name": "Archived Pack Campaign",
            "mutation_pack_id": mutation_pack_id,
            "eval_set": {"checks": ["status"]},
        },
    )
    assert campaign_response.status_code == 201
    campaign_id = campaign_response.json()["campaign_id"]

    archive_response = client.delete(f"/v1/mutation-packs/{mutation_pack_id}")
    assert archive_response.status_code == 204

    run_response = client.post(
        "/v1/runs",
        json={"trace_id": str(trace_id), "campaign_id": campaign_id},
    )
    assert run_response.status_code == 404
    assert run_response.json() == {"detail": "Mutation pack not found"}


def test_system_mutation_pack_config_is_refreshed_when_definition_drifts(
    mutation_pack_test_context: tuple[TestClient, sessionmaker[Session], UUID, FakeQueue],
) -> None:
    client, testing_session_local, project_id, _ = mutation_pack_test_context

    bootstrap = client.get("/v1/mutation-packs")
    assert bootstrap.status_code == 200

    with testing_session_local() as db:
        pack = db.scalar(
            select(MutationPack).where(
                MutationPack.project_id == project_id,
                MutationPack.name == "sepurux.max_chaos",
            )
        )
        assert pack is not None
        config = dict(pack.config) if isinstance(pack.config, dict) else {}
        config["suggested_attempts"] = 999
        mutations = config.get("mutations")
        assert isinstance(mutations, list) and mutations
        first_mutation = mutations[0]
        assert isinstance(first_mutation, dict)
        first_mutation["probability"] = 1.0
        pack.config = config
        db.add(pack)
        db.commit()

    refreshed = client.get("/v1/mutation-packs")
    assert refreshed.status_code == 200
    payload = refreshed.json()
    restored = next((row for row in payload if row["name"] == "sepurux.max_chaos"), None)
    assert restored is not None

    definition = get_registered_pack_definition("sepurux.max_chaos")
    assert definition is not None
    expected_config = definition["config"]

    assert restored["config"]["suggested_attempts"] == expected_config["suggested_attempts"]
    restored_first = restored["config"]["mutations"][0]
    expected_first = expected_config["mutations"][0]
    assert restored_first["mutation_id"] == expected_first["mutation_id"]
    assert restored_first["probability"] == expected_first["probability"]


def test_viewer_can_create_mutation_pack() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    with testing_session_local() as db:
        _, project_id, _, _, api_key_plaintext = seed_project_membership_api_key(
            db,
            role_name="viewer",
            pricing_tier="starter",
        )

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
        response = client.post(
            "/v1/mutation-packs",
            json={
                "name": "Viewer Pack",
                "description": "Should be blocked",
                "config": {"mutations": []},
            },
        )

    app.dependency_overrides.clear()
    if hasattr(app.state, "auth_session_factory"):
        delattr(app.state, "auth_session_factory")
    Base.metadata.drop_all(bind=engine)
    engine.dispose()

    assert response.status_code == 201


def test_weak_custom_pack_returns_warning_and_include_system_filter_works(
    mutation_pack_test_context: tuple[TestClient, sessionmaker[Session], UUID, FakeQueue],
) -> None:
    client, _, _, _ = mutation_pack_test_context

    create_response = client.post(
        "/v1/mutation-packs",
        json={
            "name": "Weak Pack",
            "description": "Only one schema mutation",
            "config": {
                "mutations": [
                    {
                        "mutation_id": "rename-status",
                        "type": "schema.rename_field",
                        "target": {"tool": "*"},
                        "params": {"from": "status", "to": "state"},
                    }
                ]
            },
        },
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["warning"] == "Mutation pack may be too weak to detect failures"
    assert created["coverage_score"] == 25
    assert (
        "must contain at least one failure mutation (timeout/rate_limit/auth_failure)"
        in created["validation_issues"]
    )
    assert "must contain at least one latency mutation" in created["validation_issues"]
    assert "must contain at least two distinct mutation types" in created["validation_issues"]

    custom_only = client.get("/v1/mutation-packs?include_system=false")
    assert custom_only.status_code == 200
    records = custom_only.json()
    assert all(record["is_system"] is False for record in records)
    assert any(record["name"] == "Weak Pack" for record in records)


def test_mutation_pack_coverage_endpoint_returns_expected_score(
    mutation_pack_test_context: tuple[TestClient, sessionmaker[Session], UUID, FakeQueue],
) -> None:
    client, _, _, _ = mutation_pack_test_context
    create_response = client.post(
        "/v1/mutation-packs",
        json={
            "name": "Coverage 80 Pack",
            "description": "Touch all implemented coverage categories",
            "config": {
                "mutations": [
                    {"type": "schema.rename_field"},
                    {"type": "fault.timeout"},
                    {"type": "latency_delay"},
                    {"type": "poison.inject"},
                ]
            },
        },
    )
    assert create_response.status_code == 201
    pack_id = create_response.json()["mutation_pack_id"]

    coverage_response = client.get(f"/v1/mutation-packs/{pack_id}/coverage")
    assert coverage_response.status_code == 200
    payload = coverage_response.json()
    assert payload["mutation_pack_id"] == pack_id
    assert payload["coverage_score"] == 80
    assert set(payload["categories"]) == {
        "schema",
        "fault",
        "latency",
        "security",
    }


def test_campaign_run_pack_creates_synthetic_trace_and_queues_run(
    mutation_pack_test_context: tuple[TestClient, sessionmaker[Session], UUID, FakeQueue],
) -> None:
    client, testing_session_local, project_id, fake_queue = mutation_pack_test_context

    campaign_response = client.post(
        "/v1/campaigns",
        json={
            "name": "Registry Campaign",
            "mutation_set": [{"mutation_id": "baseline", "tool": "jira.create_issue"}],
            "eval_set": {"checks": ["status"]},
        },
    )
    assert campaign_response.status_code == 201
    campaign_id = campaign_response.json()["campaign_id"]

    run_response = client.post(
        f"/v1/campaigns/{campaign_id}/run-pack",
        json={"pack": "core.reliability"},
    )
    assert run_response.status_code == 201
    payload = run_response.json()
    assert payload["campaign_id"] == campaign_id
    assert payload["mutation_pack"] == "core.reliability"

    run_id = UUID(payload["run_id"])
    trace_id = UUID(payload["trace_id"])
    mutation_pack_id = UUID(payload["mutation_pack_id"])
    assert fake_queue.calls == [(("worker.execute_run", str(run_id)), {})]

    with testing_session_local() as db:
        trace = db.execute(select(Trace).where(Trace.trace_id == trace_id)).scalar_one()
        run = db.execute(select(Run).where(Run.run_id == run_id)).scalar_one()
        pack = db.execute(
            select(MutationPack).where(MutationPack.mutation_pack_id == mutation_pack_id)
        ).scalar_one()

        assert trace.project_id == project_id
        assert trace.source == "campaign.run_pack"
        assert run.trace_id == trace_id
        assert run.campaign_id == UUID(campaign_id)
        assert run.mutation_pack_id == mutation_pack_id
        assert pack.name == "core.reliability"
