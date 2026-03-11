from __future__ import annotations

from collections.abc import Generator
from typing import Any
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import worker as worker_module
from models import AuditEvent, Base, Campaign, MutationPack, ReplayAttempt, Run, Trace, Webhook
from webhooks import generate_webhook_signature


@pytest.fixture()
def worker_db_context(
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[tuple[sessionmaker[Session], dict[str, dict[str, object]]], None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    artifacts: dict[str, dict[str, object]] = {}

    monkeypatch.setattr(worker_module, "get_session", lambda: testing_session_local())
    monkeypatch.setattr(
        worker_module, "put_json_object", lambda key, payload: artifacts.__setitem__(key, payload)
    )
    monkeypatch.setattr(worker_module, "run_counterfactual_replays", lambda **_kwargs: [])

    yield testing_session_local, artifacts

    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_execute_run_with_mutation_pack_persists_seed_and_trace(
    worker_db_context: tuple[sessionmaker[Session], dict[str, dict[str, object]]],
) -> None:
    testing_session_local, artifacts = worker_db_context
    project_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    mutation_pack_id = uuid4()
    run_id = uuid4()

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
            MutationPack(
                mutation_pack_id=mutation_pack_id,
                project_id=project_id,
                name="Schema Chaos",
                description="Rename status to state",
                config={
                    "max_mutations_per_attempt": 1,
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
            )
        )
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                mutation_pack_id=mutation_pack_id,
                name="Mutation Campaign",
                mutation_set=[
                    {
                        "mutation_id": "baseline",
                        "tool": "jira.create_issue",
                        "args": {"title": "Demo"},
                    }
                ],
                eval_set={"checks": ["status"]},
            )
        )
        db.add(
            Run(
                run_id=run_id,
                project_id=project_id,
                trace_id=trace_id,
                campaign_id=campaign_id,
                status="queued",
                summary=None,
            )
        )
        db.commit()

    worker_module.execute_run(str(run_id))

    with testing_session_local() as db:
        attempt = db.execute(
            select(ReplayAttempt).where(ReplayAttempt.run_id == run_id)
        ).scalar_one()
        run = db.execute(select(Run).where(Run.run_id == run_id)).scalar_one()

    assert attempt.result == "passed"
    assert attempt.seed is not None
    assert isinstance(attempt.mutation_trace, dict)
    assert attempt.mutation_trace.get("seed") == attempt.seed
    applied = attempt.mutation_trace.get("applied")
    assert isinstance(applied, list)
    assert applied and applied[0]["mutation_id"] == "rename-status"

    assert run.status == "completed"
    assert isinstance(run.summary, dict)
    assert run.summary.get("attempt_count") == 1

    assert artifacts
    artifact_payload = next(iter(artifacts.values()))
    events = artifact_payload.get("events")
    assert isinstance(events, list)
    tool_results = [event for event in events if event.get("type") == "tool_result"]
    assert tool_results
    result = tool_results[-1].get("result")
    assert isinstance(result, dict)
    assert result.get("state") == "replayed"


def test_run_completion_records_audit_event_and_delivers_webhook(
    worker_db_context: tuple[sessionmaker[Session], dict[str, dict[str, object]]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    testing_session_local, _ = worker_db_context
    project_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    run_id = uuid4()
    webhook_id = uuid4()

    sent_requests: list[dict[str, Any]] = []

    class _Response:
        status_code = 200
        text = "ok"

    def fake_post(
        url: str, *, content: bytes, headers: dict[str, str], timeout: float
    ) -> _Response:
        sent_requests.append(
            {
                "url": url,
                "content": content,
                "headers": headers,
                "timeout": timeout,
            }
        )
        return _Response()

    monkeypatch.setattr("webhooks.httpx.post", fake_post)
    monkeypatch.setattr("webhooks.time.sleep", lambda _seconds: None)

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
                name="Webhook Campaign",
                mutation_set=[
                    {
                        "mutation_id": "baseline",
                        "tool": "jira.create_issue",
                        "args": {"title": "Audit + webhook"},
                    }
                ],
                eval_set={"checks": ["status"]},
            )
        )
        db.add(
            Webhook(
                webhook_id=webhook_id,
                project_id=project_id,
                url="https://example.com/webhooks/sepurux",
                secret="whsec_test_secret",
                is_enabled=True,
                events=["run.completed"],
            )
        )
        db.add(
            Run(
                run_id=run_id,
                project_id=project_id,
                trace_id=trace_id,
                campaign_id=campaign_id,
                status="queued",
                summary=None,
            )
        )
        db.commit()

    worker_module.execute_run(str(run_id))

    assert len(sent_requests) == 1
    sent = sent_requests[0]
    body = sent["content"]
    assert isinstance(body, bytes)
    headers = sent["headers"]
    assert isinstance(headers, dict)
    signature = headers["X-Sepurux-Signature"]
    assert signature == generate_webhook_signature("whsec_test_secret", body)

    with testing_session_local() as db:
        completed_run = db.execute(select(Run).where(Run.run_id == run_id)).scalar_one()
        assert completed_run.status == "completed"

        audit_events = list(
            db.scalars(
                select(AuditEvent).where(
                    AuditEvent.project_id == project_id,
                    AuditEvent.event_type == "run.completed",
                )
            )
        )
        assert len(audit_events) == 1
        assert audit_events[0].event_metadata["run_id"] == str(run_id)

        webhook = db.execute(select(Webhook).where(Webhook.webhook_id == webhook_id)).scalar_one()
        assert webhook.last_success_at is not None
        assert webhook.last_error is None


def test_execute_run_prefers_run_level_mutation_pack_override(
    worker_db_context: tuple[sessionmaker[Session], dict[str, dict[str, object]]],
) -> None:
    testing_session_local, artifacts = worker_db_context
    project_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    campaign_pack_id = uuid4()
    override_pack_id = uuid4()
    run_id = uuid4()

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
            MutationPack(
                mutation_pack_id=campaign_pack_id,
                project_id=project_id,
                name="Campaign Default Pack",
                description="Drops the status field",
                config={
                    "max_mutations_per_attempt": 1,
                    "mutations": [
                        {
                            "mutation_id": "drop-status",
                            "type": "schema.drop_field",
                            "target": {"tool": "jira.*"},
                            "params": {"field": "status"},
                            "probability": 1.0,
                            "weight": 1.0,
                        }
                    ],
                },
            )
        )
        db.add(
            MutationPack(
                mutation_pack_id=override_pack_id,
                project_id=project_id,
                name="Run Override Pack",
                description="Renames the status field",
                config={
                    "max_mutations_per_attempt": 1,
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
            )
        )
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                mutation_pack_id=campaign_pack_id,
                name="Mutation Campaign",
                mutation_set=[
                    {
                        "mutation_id": "baseline",
                        "tool": "jira.create_issue",
                        "args": {"title": "Demo"},
                    }
                ],
                eval_set={"checks": ["status"]},
            )
        )
        db.add(
            Run(
                run_id=run_id,
                project_id=project_id,
                trace_id=trace_id,
                campaign_id=campaign_id,
                mutation_pack_id=override_pack_id,
                status="queued",
                summary=None,
            )
        )
        db.commit()

    worker_module.execute_run(str(run_id))

    artifact_payload = next(iter(artifacts.values()))
    events = artifact_payload.get("events")
    assert isinstance(events, list)
    tool_results = [event for event in events if event.get("type") == "tool_result"]
    assert tool_results
    result = tool_results[-1].get("result")
    assert isinstance(result, dict)
    assert result.get("state") == "replayed"
    assert "status" not in result


def test_execute_run_fault_mutation_skips_internal_trace_load_tool(
    worker_db_context: tuple[sessionmaker[Session], dict[str, dict[str, object]]],
) -> None:
    testing_session_local, artifacts = worker_db_context
    project_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    mutation_pack_id = uuid4()
    run_id = uuid4()

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
            MutationPack(
                mutation_pack_id=mutation_pack_id,
                project_id=project_id,
                name="Wildcard Timeout Pack",
                description="Applies a timeout fault without an explicit target tool.",
                config={
                    "max_mutations_per_attempt": 1,
                    "mutations": [
                        {
                            "mutation_id": "timeout-tool-call",
                            "type": "fault.timeout",
                            "probability": 1.0,
                            "weight": 1.0,
                        }
                    ],
                },
            )
        )
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                mutation_pack_id=mutation_pack_id,
                name="Mutation Campaign",
                mutation_set=[
                    {
                        "mutation_id": "baseline",
                        "tool": "jira.create_issue",
                        "args": {"title": "Demo"},
                    }
                ],
                eval_set={"checks": ["status"]},
            )
        )
        db.add(
            Run(
                run_id=run_id,
                project_id=project_id,
                trace_id=trace_id,
                campaign_id=campaign_id,
                status="queued",
                summary=None,
            )
        )
        db.commit()

    worker_module.execute_run(str(run_id))

    with testing_session_local() as db:
        attempt = db.execute(
            select(ReplayAttempt).where(ReplayAttempt.run_id == run_id)
        ).scalar_one()

    assert attempt.result == "failed"
    assert attempt.failure_reason == "timeout"
    assert attempt.first_failure_tool == "jira.create_issue"

    artifact_payload = next(iter(artifacts.values()))
    events = artifact_payload.get("events")
    assert isinstance(events, list)
    assert events[-1]["type"] == "error"
    assert events[-1]["tool"] == "jira.create_issue"
