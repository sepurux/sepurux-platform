from __future__ import annotations

from collections.abc import Generator
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import Base, Campaign, PolicyEvent, PolicyPack, PolicyPackVersion, Project, Run, Trace
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
def policy_test_context(
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


def test_policy_pack_crud_is_project_scoped(
    policy_test_context: tuple[TestClient, sessionmaker[Session], UUID, FakeQueue],
) -> None:
    client, testing_session_local, project_id, _ = policy_test_context
    other_project_id = uuid4()
    other_pack_id = uuid4()

    create_response = client.post(
        "/v1/policy-packs",
        json={
            "name": "Strict Pack",
            "engine": "builtin",
            "policy": {
                "version": "0.1",
                "defaults": {"unknown_tools": "allow"},
                "irreversible": {
                    "tools": [
                        "payments.refund",
                        "jira.create_issue(commit)",
                        "jira.create_issue_commit",
                    ]
                },
                "approval": {"token_field": "confirmation_token"},
                "opa": {
                    "package": "crashlab.policy",
                    "query": "data.crashlab.policy.decision",
                },
            },
        },
    )
    assert create_response.status_code == 201
    created_payload = create_response.json()
    created_pack_id = UUID(created_payload["policy_pack_id"])
    assert created_payload["project_id"] == str(project_id)
    assert created_payload["engine"] == "builtin"

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
            PolicyPack(
                policy_pack_id=other_pack_id,
                project_id=other_project_id,
                name="Other Project Pack",
                engine="builtin",
                policy={
                    "version": "0.1",
                    "defaults": {"unknown_tools": "allow"},
                    "irreversible": {"tools": []},
                },
            )
        )
        db.commit()

    list_response = client.get("/v1/policy-packs")
    assert list_response.status_code == 200
    listed_ids = {item["policy_pack_id"] for item in list_response.json()}
    assert str(created_pack_id) in listed_ids
    assert str(other_pack_id) not in listed_ids

    get_created = client.get(f"/v1/policy-packs/{created_pack_id}")
    assert get_created.status_code == 200
    assert get_created.json()["name"] == "Strict Pack"

    get_other = client.get(f"/v1/policy-packs/{other_pack_id}")
    assert get_other.status_code == 404
    assert get_other.json() == {"detail": "Policy pack not found"}


def test_policy_pack_engine_validation_allows_opa_and_rejects_unknown(
    policy_test_context: tuple[TestClient, sessionmaker[Session], UUID, FakeQueue],
) -> None:
    client, _, _, _ = policy_test_context

    opa_response = client.post(
        "/v1/policy-packs",
        json={
            "name": "OPA Pack",
            "engine": "opa",
            "policy": {
                "version": "0.1",
                "defaults": {"unknown_tools": "allow"},
                "approval": {"token_field": "confirmation_token"},
                "irreversible": {"tools": ["payments.refund"]},
                "opa": {
                    "package": "crashlab.policy",
                    "query": "data.crashlab.policy.decision",
                },
            },
        },
    )
    assert opa_response.status_code == 201
    assert opa_response.json()["engine"] == "opa"

    invalid_response = client.post(
        "/v1/policy-packs",
        json={
            "name": "Invalid Engine Pack",
            "engine": "rego-direct",
            "policy": {"version": "0.1"},
        },
    )
    assert invalid_response.status_code == 422


def test_run_create_with_policy_pack_and_policy_event_listing(
    policy_test_context: tuple[TestClient, sessionmaker[Session], UUID, FakeQueue],
) -> None:
    client, testing_session_local, project_id, fake_queue = policy_test_context
    trace_id = uuid4()
    campaign_id = uuid4()
    other_trace_id = uuid4()
    other_campaign_id = uuid4()
    other_run_id = uuid4()
    other_project_id = uuid4()

    with testing_session_local() as db:
        current_project = db.execute(
            select(Project).where(Project.project_id == project_id)
        ).scalar_one()
        db.add(
            Trace(
                trace_id=trace_id,
                project_id=project_id,
                source="test",
                s3_key=f"traces/{trace_id}.json",
            )
        )
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                name="Policy Campaign",
                mutation_set=[{"mutation_id": "baseline"}],
                eval_set={"checks": ["status"]},
            )
        )
        db.add(
            Project(
                project_id=other_project_id,
                tenant_id=current_project.tenant_id,
                name="Other Project",
            )
        )
        db.commit()

    pack_response = client.post(
        "/v1/policy-packs",
        json={
            "name": "Require Approval",
            "engine": "builtin",
            "policy": {
                "version": "0.1",
                "defaults": {"unknown_tools": "allow"},
                "irreversible": {
                    "tools": [
                        "payments.refund",
                        "jira.create_issue(commit)",
                        "jira.create_issue_commit",
                    ]
                },
                "approval": {"token_field": "confirmation_token"},
                "opa": {
                    "package": "crashlab.policy",
                    "query": "data.crashlab.policy.decision",
                },
            },
        },
    )
    assert pack_response.status_code == 201
    policy_pack_id = pack_response.json()["policy_pack_id"]

    run_response = client.post(
        "/v1/runs",
        json={
            "trace_id": str(trace_id),
            "campaign_id": str(campaign_id),
            "policy_pack_id": policy_pack_id,
        },
    )
    assert run_response.status_code == 201
    run_payload = run_response.json()
    run_id = UUID(run_payload["run_id"])
    assert run_payload["policy_pack_id"] == policy_pack_id
    assert fake_queue.calls == [(("worker.execute_run", str(run_id)), {})]

    with testing_session_local() as db:
        db.add(
            Trace(
                trace_id=other_trace_id,
                project_id=other_project_id,
                source="test",
                s3_key="traces/other.json",
            )
        )
        db.add(
            Campaign(
                campaign_id=other_campaign_id,
                project_id=other_project_id,
                name="Other Campaign",
                mutation_set=[],
                eval_set={},
            )
        )
        db.add(
            Run(
                run_id=other_run_id,
                project_id=other_project_id,
                trace_id=other_trace_id,
                campaign_id=other_campaign_id,
                status="completed",
                summary={},
            )
        )
        db.add_all(
            [
                PolicyEvent(
                    policy_event_id=uuid4(),
                    run_id=run_id,
                    attempt_id=None,
                    event_index=2,
                    tool="payments.refund",
                    action="tool_call",
                    decision="require_approval",
                    reason="tool requires approval token",
                    input={
                        "tool": {"name": "payments.refund", "args": {"amount": 10}},
                        "context": {
                            "run_id": str(run_id),
                            "attempt_id": None,
                            "project_id": str(project_id),
                        },
                        "metadata": {"event_index": 2},
                    },
                    created_at=datetime(2026, 2, 27, 1, 0, tzinfo=UTC),
                ),
                PolicyEvent(
                    policy_event_id=uuid4(),
                    run_id=run_id,
                    attempt_id=None,
                    event_index=2,
                    tool="jira.create_issue",
                    action="tool_call",
                    decision="allow",
                    reason="allowed",
                    input={
                        "tool": {"name": "jira.create_issue", "args": {"title": "Draft"}},
                        "context": {
                            "run_id": str(run_id),
                            "attempt_id": None,
                            "project_id": str(project_id),
                        },
                        "metadata": {"event_index": 2},
                    },
                    created_at=datetime(2026, 2, 27, 1, 1, tzinfo=UTC),
                ),
                PolicyEvent(
                    policy_event_id=uuid4(),
                    run_id=other_run_id,
                    attempt_id=None,
                    event_index=2,
                    tool="db.write.users",
                    action="tool_call",
                    decision="deny",
                    reason="no writes in replay",
                    input={
                        "tool": {"name": "db.write.users", "args": {"id": "u-1"}},
                        "context": {
                            "run_id": str(other_run_id),
                            "attempt_id": None,
                            "project_id": str(other_project_id),
                        },
                        "metadata": {"event_index": 2},
                    },
                    created_at=datetime(2026, 2, 27, 1, 2, tzinfo=UTC),
                ),
            ]
        )
        db.commit()

    first_page = client.get(f"/v1/runs/{run_id}/policy-events?limit=1&offset=0")
    assert first_page.status_code == 200
    first_payload = first_page.json()
    assert len(first_payload) == 1
    assert first_payload[0]["tool"] == "payments.refund"
    assert first_payload[0]["input"]["tool"]["name"] == "payments.refund"

    second_page = client.get(f"/v1/runs/{run_id}/policy-events?limit=10&offset=1")
    assert second_page.status_code == 200
    second_payload = second_page.json()
    assert len(second_payload) == 1
    assert second_payload[0]["tool"] == "jira.create_issue"


def test_policy_pack_update_creates_new_version_and_sets_active(
    policy_test_context: tuple[TestClient, sessionmaker[Session], UUID, FakeQueue],
) -> None:
    client, testing_session_local, _, _ = policy_test_context
    create_response = client.post(
        "/v1/policy-packs",
        json={
            "name": "Versioned Pack",
            "engine": "builtin",
            "policy": {
                "version": "0.1",
                "defaults": {"unknown_tools": "allow"},
                "irreversible": {"tools": ["payments.refund"]},
                "approval": {"token_field": "confirmation_token"},
            },
        },
    )
    assert create_response.status_code == 201
    pack_id = create_response.json()["policy_pack_id"]
    original_policy = create_response.json()["policy"]
    assert create_response.json()["active_version_number"] == 1

    update_response = client.patch(
        f"/v1/policy-packs/{pack_id}",
        json={
            "policy": {
                "version": "0.2",
                "defaults": {"unknown_tools": "deny"},
                "irreversible": {"tools": ["payments.refund", "jira.create_issue(commit)"]},
                "approval": {"token_field": "confirmation_token"},
            },
        },
    )
    assert update_response.status_code == 200
    update_payload = update_response.json()
    assert update_payload["active_version_number"] == 2
    assert update_payload["policy"]["version"] == "0.2"

    versions_response = client.get(f"/v1/policy-packs/{pack_id}/versions")
    assert versions_response.status_code == 200
    versions = versions_response.json()
    assert [item["version_number"] for item in versions] == [2, 1]
    assert versions[0]["is_active"] is True
    assert versions[1]["is_active"] is False

    with testing_session_local() as db:
        persisted_pack = db.execute(
            select(PolicyPack).where(PolicyPack.policy_pack_id == UUID(pack_id))
        ).scalar_one()
    assert persisted_pack.policy == original_policy


def test_run_snapshots_policy_pack_version_before_updates(
    policy_test_context: tuple[TestClient, sessionmaker[Session], UUID, FakeQueue],
) -> None:
    client, testing_session_local, project_id, fake_queue = policy_test_context
    trace_id = uuid4()
    campaign_id = uuid4()

    with testing_session_local() as db:
        db.add(
            Trace(
                trace_id=trace_id,
                project_id=project_id,
                source="test",
                s3_key=f"traces/{trace_id}.json",
            )
        )
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                name="Snapshot Campaign",
                mutation_set=[{"mutation_id": "baseline", "tool": "jira.create_issue"}],
                eval_set={"checks": ["status"]},
            )
        )
        db.commit()

    pack_response = client.post(
        "/v1/policy-packs",
        json={
            "name": "Snapshot Pack",
            "engine": "builtin",
            "policy": {
                "version": "0.1",
                "defaults": {"unknown_tools": "allow"},
                "irreversible": {"tools": ["payments.refund"]},
                "approval": {"token_field": "confirmation_token"},
            },
        },
    )
    assert pack_response.status_code == 201
    pack_id = pack_response.json()["policy_pack_id"]
    initial_active_version = pack_response.json()["active_version_id"]

    first_run = client.post(
        "/v1/runs",
        json={
            "trace_id": str(trace_id),
            "campaign_id": str(campaign_id),
            "policy_pack_id": pack_id,
        },
    )
    assert first_run.status_code == 201
    first_run_payload = first_run.json()
    first_run_id = first_run_payload["run_id"]
    assert first_run_payload["effective_policy_pack_version_id"] == initial_active_version

    update_response = client.patch(
        f"/v1/policy-packs/{pack_id}",
        json={
            "policy": {
                "version": "0.2",
                "defaults": {"unknown_tools": "deny"},
                "irreversible": {"tools": ["payments.refund", "jira.create_issue(commit)"]},
                "approval": {"token_field": "confirmation_token"},
            },
        },
    )
    assert update_response.status_code == 200
    updated_active_version = update_response.json()["active_version_id"]
    assert updated_active_version != initial_active_version

    second_run = client.post(
        "/v1/runs",
        json={
            "trace_id": str(trace_id),
            "campaign_id": str(campaign_id),
            "policy_pack_id": pack_id,
        },
    )
    assert second_run.status_code == 201
    second_run_payload = second_run.json()
    assert second_run_payload["effective_policy_pack_version_id"] == updated_active_version
    assert second_run_payload["effective_policy_pack_version_id"] != initial_active_version

    first_run_after_update = client.get(f"/v1/runs/{first_run_id}")
    assert first_run_after_update.status_code == 200
    assert first_run_after_update.json()["effective_policy_pack_version_id"] == initial_active_version

    assert len(fake_queue.calls) == 2


def test_policy_pack_rollback_sets_active_to_prior_version(
    policy_test_context: tuple[TestClient, sessionmaker[Session], UUID, FakeQueue],
) -> None:
    client, testing_session_local, _, _ = policy_test_context
    create_response = client.post(
        "/v1/policy-packs",
        json={
            "name": "Rollback Pack",
            "engine": "builtin",
            "policy": {
                "version": "0.1",
                "defaults": {"unknown_tools": "allow"},
                "irreversible": {"tools": ["payments.refund"]},
                "approval": {"token_field": "confirmation_token"},
            },
        },
    )
    assert create_response.status_code == 201
    pack_id = create_response.json()["policy_pack_id"]
    v1_id = create_response.json()["active_version_id"]

    v2_response = client.patch(
        f"/v1/policy-packs/{pack_id}",
        json={
            "policy": {
                "version": "0.2",
                "defaults": {"unknown_tools": "allow"},
                "irreversible": {"tools": ["payments.refund", "jira.create_issue(commit)"]},
                "approval": {"token_field": "confirmation_token"},
            },
        },
    )
    assert v2_response.status_code == 200
    assert v2_response.json()["active_version_number"] == 2

    rollback_response = client.post(
        f"/v1/policy-packs/{pack_id}/rollback",
        json={"version_number": 1},
    )
    assert rollback_response.status_code == 200
    rollback_payload = rollback_response.json()
    assert rollback_payload["active_version_number"] == 1
    assert rollback_payload["active_version_id"] == v1_id
    assert rollback_payload["policy"]["version"] == "0.1"

    versions_response = client.get(f"/v1/policy-packs/{pack_id}/versions")
    assert versions_response.status_code == 200
    versions = versions_response.json()
    active_versions = [item for item in versions if item["is_active"]]
    assert len(active_versions) == 1
    assert active_versions[0]["version_number"] == 1

    with testing_session_local() as db:
        db_versions = list(
            db.scalars(
                select(PolicyPackVersion)
                .where(PolicyPackVersion.policy_pack_id == UUID(pack_id))
                .order_by(PolicyPackVersion.version_number.asc())
            )
        )
    assert [item.version_number for item in db_versions] == [1, 2]
