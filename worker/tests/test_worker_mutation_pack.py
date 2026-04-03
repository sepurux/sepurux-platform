from __future__ import annotations

from collections.abc import Generator
from typing import Any
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import worker as worker_module
from models import (
    AuditEvent,
    Base,
    Campaign,
    Failure,
    MutationPack,
    ReplayAttempt,
    Run,
    Trace,
    TraceStep,
    Webhook,
)
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
                eval_set={"checks": ["ok"]},
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
        trace_steps = list(
            db.scalars(
                select(TraceStep)
                .where(TraceStep.trace_id == trace_id)
                .order_by(TraceStep.started_at.asc(), TraceStep.trace_step_id.asc())
            )
        )

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
    assert any(
        step.step_type == "mutation" and step.mutation_name == "rename-status"
        for step in trace_steps
    )
    assert any(
        step.step_type == "tool_call" and step.step_name == "jira.create_issue"
        for step in trace_steps
    )

    assert artifacts
    artifact_payload = next(iter(artifacts.values()))
    events = artifact_payload.get("events")
    assert isinstance(events, list)
    tool_results = [event for event in events if event.get("type") == "tool_result"]
    assert tool_results
    result = tool_results[-1].get("result")
    assert isinstance(result, dict)
    assert result.get("state") == "replayed"


def test_execute_run_autoseeds_baseline_when_campaign_mutation_set_empty(
    worker_db_context: tuple[sessionmaker[Session], dict[str, dict[str, object]]],
) -> None:
    testing_session_local, artifacts = worker_db_context
    project_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    run_id = uuid4()

    with testing_session_local() as db:
        db.add(
            Trace(
                trace_id=trace_id,
                project_id=project_id,
                source="test",
                normalized_payload={
                    "trace_version": "0.2",
                    "source": "sdk",
                    "events": [
                        {"index": 1, "type": "tool_call", "tool": "stripe.get_payment_intent", "args": {"payment_intent_id": "pi_123"}},
                        {"index": 2, "type": "tool_result", "tool": "stripe.get_payment_intent", "result": {"ok": True}},
                    ],
                },
                s3_key=f"traces/{trace_id}.json",
            )
        )
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                name="Autoseed Campaign",
                mutation_set=[],
                eval_set={"checks": ["ok"], "attempts_count": 1},
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
        attempts = list(db.scalars(select(ReplayAttempt).where(ReplayAttempt.run_id == run_id)))
        failures = list(db.scalars(select(Failure).where(Failure.run_id == run_id)))
        run = db.scalar(select(Run).where(Run.run_id == run_id))

    assert len(attempts) == 1
    assert attempts[0].mutation_id == "baseline.auto_seed"
    assert attempts[0].result == "passed"
    assert attempts[0].failure_reason is None
    assert len(failures) == 0
    assert isinstance(run, Run)
    assert isinstance(run.summary, dict)
    assert run.summary.get("failed_count") == 0

    assert artifacts
    artifact_payload = next(iter(artifacts.values()))
    events = artifact_payload.get("events")
    assert isinstance(events, list)
    seeded_tool_calls = [
        event for event in events if event.get("type") == "tool_call" and event.get("tool") == "stripe.get_payment_intent"
    ]
    assert seeded_tool_calls


def test_execute_run_prefers_resolved_mutation_set_from_run_summary(
    worker_db_context: tuple[sessionmaker[Session], dict[str, dict[str, object]]],
) -> None:
    testing_session_local, artifacts = worker_db_context
    project_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    run_id = uuid4()

    with testing_session_local() as db:
        db.add(
            Trace(
                trace_id=trace_id,
                project_id=project_id,
                source="test",
                normalized_payload={
                    "events": [
                        {"type": "tool_call", "tool": "payments.refund", "args": {"payment_id": "pay_1"}},
                        {"type": "tool_result", "tool": "payments.refund", "result": {"ok": True}},
                    ],
                },
                s3_key=f"traces/{trace_id}.json",
            )
        )
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                name="Resolved Mutation Campaign",
                mutation_set=[
                    {"mutation_id": "refund", "tool": "payments.refund", "args": {"payment_id": "pay_1"}},
                    {"mutation_id": "dispatch", "tool": "dispatch.create_visit", "args": {"slot": "2026-04-02T12:00:00Z"}},
                ],
                eval_set={"checks": ["ok"], "attempts_count": 1},
            )
        )
        db.add(
            Run(
                run_id=run_id,
                project_id=project_id,
                trace_id=trace_id,
                campaign_id=campaign_id,
                status="queued",
                summary={
                    "resolved_mutation_set": [
                        {
                            "mutation_id": "refund",
                            "tool": "payments.refund",
                            "args": {"payment_id": "pay_1"},
                        }
                    ]
                },
            )
        )
        db.commit()

    worker_module.execute_run(str(run_id))

    with testing_session_local() as db:
        attempts = list(db.scalars(select(ReplayAttempt).where(ReplayAttempt.run_id == run_id)))
        run = db.scalar(select(Run).where(Run.run_id == run_id))

    assert len(attempts) == 1
    assert attempts[0].mutation_id == "refund"
    assert isinstance(run, Run)
    assert isinstance(run.summary, dict)
    assert run.summary.get("attempt_count") == 1
    resolved = run.summary.get("resolved_mutation_set")
    assert isinstance(resolved, list)
    assert len(resolved) == 1
    assert resolved[0]["tool"] == "payments.refund"

    assert artifacts
    artifact_payload = next(iter(artifacts.values()))
    events = artifact_payload.get("events")
    assert isinstance(events, list)
    replayed_tools = [
        event.get("tool")
        for event in events
        if event.get("type") == "tool_call" and event.get("tool") not in {"trace.load"}
    ]
    assert replayed_tools == ["payments.refund"]


def test_execute_run_reuses_replay_seed_basis_for_deterministic_ci_sampling(
    worker_db_context: tuple[sessionmaker[Session], dict[str, dict[str, object]]],
) -> None:
    testing_session_local, _ = worker_db_context
    project_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    mutation_pack_id = uuid4()
    first_run_id = uuid4()
    second_run_id = uuid4()
    replay_seed_basis = "ci:payments-refund-stable"

    with testing_session_local() as db:
        db.add(
            Trace(
                trace_id=trace_id,
                project_id=project_id,
                source="test",
                normalized_payload={
                    "events": [
                        {"type": "tool_call", "tool": "payments.refund", "args": {"payment_id": "pay_1"}},
                        {"type": "tool_result", "tool": "payments.refund", "result": {"ok": True, "status": "ok"}},
                    ],
                },
                s3_key=f"traces/{trace_id}.json",
            )
        )
        db.add(
            MutationPack(
                mutation_pack_id=mutation_pack_id,
                project_id=project_id,
                name="Deterministic CI Pack",
                description="Multiple replay mutations to verify stable sampling",
                config={
                    "max_mutations_per_attempt": 1,
                    "mutations": [
                        {
                            "mutation_id": "rename-status",
                            "type": "schema.rename_field",
                            "target": {"tool": "payments.*"},
                            "params": {"from": "status", "to": "state"},
                            "probability": 1.0,
                            "weight": 1.0,
                        },
                        {
                            "mutation_id": "timeout-refund",
                            "type": "fault.timeout",
                            "target": {"tool": "payments.*"},
                            "probability": 1.0,
                            "weight": 1.0,
                        },
                        {
                            "mutation_id": "delay-refund",
                            "type": "latency_delay",
                            "target": {"tool": "payments.*"},
                            "params": {"min_ms": 100, "max_ms": 500},
                            "probability": 1.0,
                            "weight": 1.0,
                        },
                    ],
                },
            )
        )
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                mutation_pack_id=mutation_pack_id,
                name="Deterministic CI Campaign",
                mutation_set=[
                    {
                        "mutation_id": "baseline.refund",
                        "tool": "payments.refund",
                        "args": {"payment_id": "pay_1"},
                    }
                ],
                eval_set={"checks": ["status"], "attempts_count": 6},
            )
        )
        db.add_all(
            [
                Run(
                    run_id=first_run_id,
                    project_id=project_id,
                    trace_id=trace_id,
                    campaign_id=campaign_id,
                    mutation_pack_id=mutation_pack_id,
                    status="queued",
                    summary={"replay_seed_basis": replay_seed_basis},
                ),
                Run(
                    run_id=second_run_id,
                    project_id=project_id,
                    trace_id=trace_id,
                    campaign_id=campaign_id,
                    mutation_pack_id=mutation_pack_id,
                    status="queued",
                    summary={"replay_seed_basis": replay_seed_basis},
                ),
            ]
        )
        db.commit()

    worker_module.execute_run(str(first_run_id))
    worker_module.execute_run(str(second_run_id))

    with testing_session_local() as db:
        first_attempts = list(
            db.scalars(
                select(ReplayAttempt)
                .where(ReplayAttempt.run_id == first_run_id)
                .order_by(ReplayAttempt.seed.asc(), ReplayAttempt.attempt_id.asc())
            )
        )
        second_attempts = list(
            db.scalars(
                select(ReplayAttempt)
                .where(ReplayAttempt.run_id == second_run_id)
                .order_by(ReplayAttempt.seed.asc(), ReplayAttempt.attempt_id.asc())
            )
        )
        first_run = db.scalar(select(Run).where(Run.run_id == first_run_id))
        second_run = db.scalar(select(Run).where(Run.run_id == second_run_id))

    assert [attempt.seed for attempt in first_attempts] == [attempt.seed for attempt in second_attempts]
    assert [attempt.mutation_id for attempt in first_attempts] == [
        attempt.mutation_id for attempt in second_attempts
    ]
    assert [attempt.result for attempt in first_attempts] == [attempt.result for attempt in second_attempts]
    assert [attempt.failure_reason for attempt in first_attempts] == [
        attempt.failure_reason for attempt in second_attempts
    ]
    assert isinstance(first_run, Run)
    assert isinstance(second_run, Run)
    assert isinstance(first_run.summary, dict)
    assert isinstance(second_run.summary, dict)
    assert first_run.summary.get("replay_seed_basis") == replay_seed_basis
    assert second_run.summary.get("replay_seed_basis") == replay_seed_basis


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


def test_execute_run_repeats_attempts_from_eval_set_count(
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
                name="Stable Rename Pack",
                description="Always rename the status field",
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
                name="Repeated Campaign",
                mutation_set=[
                    {
                        "mutation_id": "baseline",
                        "tool": "jira.create_issue",
                        "args": {"title": "Demo"},
                    }
                ],
                eval_set={"checks": ["ok"], "attempts_count": 3},
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
        attempts = list(
            db.scalars(
                select(ReplayAttempt)
                .where(ReplayAttempt.run_id == run_id)
                .order_by(ReplayAttempt.created_at.asc(), ReplayAttempt.attempt_id.asc())
            )
        )
        run = db.execute(select(Run).where(Run.run_id == run_id)).scalar_one()

    assert len(attempts) == 3
    assert all(attempt.result == "passed" for attempt in attempts)
    summary = run.summary
    assert isinstance(summary, dict)
    assert summary["attempt_count"] == 3
    assert summary["passed_count"] == 3
    assert summary["pass_rate"] == 1.0
    assert len(artifacts) == 3


def test_execute_run_preserves_ci_batch_metadata_in_summary(
    worker_db_context: tuple[sessionmaker[Session], dict[str, dict[str, object]]],
) -> None:
    testing_session_local, _ = worker_db_context
    project_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    run_id = uuid4()
    ci_batch_id = str(uuid4())
    ci_thresholds = {
        "min_pass_rate": 0.8,
        "max_unsafe": 0,
        "max_failures": 5,
    }

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
                name="CI Summary Campaign",
                mutation_set=[
                    {
                        "mutation_id": "baseline",
                        "tool": "jira.create_issue",
                        "args": {"title": "Demo"},
                    }
                ],
                eval_set={"checks": ["status"], "attempts_count": 1},
            )
        )
        db.add(
            Run(
                run_id=run_id,
                project_id=project_id,
                trace_id=trace_id,
                campaign_id=campaign_id,
                status="queued",
                summary={
                    "ci_thresholds": ci_thresholds,
                    "ci_batch_id": ci_batch_id,
                },
            )
        )
        db.commit()

    worker_module.execute_run(str(run_id))

    with testing_session_local() as db:
        run = db.execute(select(Run).where(Run.run_id == run_id)).scalar_one()

    summary = run.summary
    assert isinstance(summary, dict)
    assert summary["attempt_count"] == 1
    assert summary["ci_thresholds"] == ci_thresholds
    assert summary["ci_batch_id"] == ci_batch_id


def test_execute_run_status_check_fails_on_schema_rename(
    worker_db_context: tuple[sessionmaker[Session], dict[str, dict[str, object]]],
) -> None:
    testing_session_local, _ = worker_db_context
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
                name="Strict Status Pack",
                description="Always rename status to state",
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
                name="Strict Status Campaign",
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

    assert attempt.result == "failed"
    assert attempt.failure_reason == "missing_field"
    assert attempt.first_failure_tool == "jira.create_issue"
    summary = run.summary
    assert isinstance(summary, dict)
    assert summary["failed_count"] == 1
    assert summary["pass_rate"] == 0.0


def test_execute_run_uses_trace_hardening_schema_adapter_from_summary(
    worker_db_context: tuple[sessionmaker[Session], dict[str, dict[str, object]]],
) -> None:
    testing_session_local, _ = worker_db_context
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
                name="Strict Status Pack",
                description="Always rename status to state",
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
                name="Trace Adapter Campaign",
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
                summary={
                    "trace_hardening": {
                        "schema_adapter": {"mappings": {"status": "state"}},
                        "source": "trace_inference_v1",
                    }
                },
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
    assert attempt.failure_reason is None
    summary = run.summary
    assert isinstance(summary, dict)
    assert summary["pass_rate"] == 1.0
    assert summary["trace_hardening"] == {
        "schema_adapter": {"mappings": {"status": "state"}},
        "source": "trace_inference_v1",
    }


def test_execute_run_uses_trace_hardening_retry_policy_from_summary(
    worker_db_context: tuple[sessionmaker[Session], dict[str, dict[str, object]]],
) -> None:
    testing_session_local, _ = worker_db_context
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
                name="Rate Limit Pack",
                description="Always inject a rate limit failure",
                config={
                    "max_mutations_per_attempt": 1,
                    "mutations": [
                        {
                            "mutation_id": "rate-limit",
                            "type": "fault.rate_limit",
                            "target": {"tool": "jira.*"},
                            "params": {"min_backoff_ms": 300},
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
                name="Trace Retry Campaign",
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
                summary={
                    "trace_hardening": {
                        "retry_policy": {"max_retries": 3, "backoff_ms": 900},
                        "source": "trace_inference_v1",
                    }
                },
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
    assert attempt.failure_reason is None
    summary = run.summary
    assert isinstance(summary, dict)
    assert summary["pass_rate"] == 1.0
    template_overrides = summary.get("template_overrides")
    assert isinstance(template_overrides, dict)
    retry_policy = template_overrides.get("retry_policy")
    assert retry_policy == {"max_retries": 3, "backoff_ms": 900}
    assert summary["trace_hardening"] == {
        "retry_policy": {"max_retries": 3, "backoff_ms": 900},
        "source": "trace_inference_v1",
    }


def test_execute_run_status_check_fails_on_poisoned_status(
    worker_db_context: tuple[sessionmaker[Session], dict[str, dict[str, object]]],
) -> None:
    testing_session_local, _ = worker_db_context
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
                name="Poison Status Pack",
                description="Always poison the status field",
                config={
                    "max_mutations_per_attempt": 1,
                    "mutations": [
                        {
                            "mutation_id": "poison-status",
                            "type": "poison.inject",
                            "target": {"tool": "jira.*"},
                            "params": {"field": "status", "payload": "::poisoned::"},
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
                name="Strict Poison Campaign",
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
    assert attempt.failure_reason == "schema_mismatch"
    assert attempt.first_failure_tool == "jira.create_issue"


def test_execute_run_counterfactuals_use_applied_mutation_context(
    worker_db_context: tuple[sessionmaker[Session], dict[str, dict[str, object]]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    testing_session_local, _ = worker_db_context
    project_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    mutation_pack_id = uuid4()
    run_id = uuid4()
    captured_mutations: list[dict[str, object]] = []

    def capture_counterfactuals(**kwargs: object) -> list[object]:
        mutation = kwargs.get("mutation")
        if isinstance(mutation, dict):
            captured_mutations.append(mutation)
        return []

    monkeypatch.setattr(worker_module, "run_counterfactual_replays", capture_counterfactuals)

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
                name="Rate Limit Pack",
                description="Always inject a rate limit failure",
                config={
                    "max_mutations_per_attempt": 1,
                    "mutations": [
                        {
                            "mutation_id": "fault.rate_limit",
                            "type": "fault.rate_limit",
                            "target": {"tool": "jira.*"},
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
                name="Counterfactual Campaign",
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
    assert attempt.failure_reason == "rate_limited"
    assert attempt.first_failure_tool == "jira.create_issue"
    assert attempt.mutation_id == "fault.rate_limit"
    assert len(captured_mutations) == 1
    assert captured_mutations[0]["mutation_id"] == "fault.rate_limit"
    assert captured_mutations[0]["tool"] == "jira.create_issue"
    assert captured_mutations[0]["args"] == {"title": "Demo"}
    assert captured_mutations[0]["failure_reason"] == "rate_limited"
    assert captured_mutations[0]["force_fail"] is True


def test_execute_run_persists_failure_records_and_reliability_summary(
    worker_db_context: tuple[sessionmaker[Session], dict[str, dict[str, object]]],
) -> None:
    testing_session_local, _ = worker_db_context
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
                name="Timeout Pack",
                description="Always timeout jira calls",
                config={
                    "max_mutations_per_attempt": 1,
                    "mutations": [
                        {
                            "mutation_id": "fault.timeout",
                            "type": "fault.timeout",
                            "target": {"tool": "jira.*"},
                            "params": {"timeout_ms": 3000},
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
                name="Failure Campaign",
                mutation_set=[
                    {
                        "mutation_id": "baseline",
                        "tool": "jira.create_issue",
                        "args": {"title": "Failure"},
                    }
                ],
                eval_set={"checks": ["status"], "attempts_count": 2},
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
        failures = list(
            db.scalars(
                select(Failure).where(Failure.run_id == run_id).order_by(Failure.created_at.asc())
            )
        )
        run = db.execute(select(Run).where(Run.run_id == run_id)).scalar_one()

    assert len(failures) == 2
    assert all(failure.failure_type == "tool_timeout" for failure in failures)
    assert all(failure.severity == "high" for failure in failures)

    summary = run.summary
    assert isinstance(summary, dict)
    assert summary["attempt_count"] == 2
    assert summary["failed_count"] == 2
    assert summary["reliability_score"] == 90.0
    assert summary["reliability_status"] == "healthy"
    assert summary["classified_failures"] == 2
    assert summary["failure_breakdown"] == [{"type": "tool_timeout", "count": 2}]
