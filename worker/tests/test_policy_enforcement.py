from __future__ import annotations

from collections.abc import Generator
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import worker as worker_module
from models import Base, Campaign, PolicyEvent, PolicyPack, ReplayAttempt, Run, Trace


@pytest.fixture()
def worker_db_context(
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[sessionmaker[Session], None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    monkeypatch.setattr(worker_module, "get_session", lambda: testing_session_local())
    monkeypatch.setattr(worker_module, "put_json_object", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(worker_module, "run_counterfactual_replays", lambda **_kwargs: [])

    yield testing_session_local

    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_policy_pack_requires_approval_and_records_policy_event(
    worker_db_context: sessionmaker[Session],
) -> None:
    project_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    policy_pack_id = uuid4()
    run_id = uuid4()

    with worker_db_context() as db:
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
                mutation_set=[
                    {
                        "mutation_id": "refund-without-token",
                        "tool": "payments.refund",
                        "args": {"order_id": "ord-123", "amount": 42},
                    }
                ],
                eval_set={"checks": ["status"]},
            )
        )
        db.add(
            PolicyPack(
                policy_pack_id=policy_pack_id,
                project_id=project_id,
                name="Strict Refund Policy",
                version="0.1.0",
                policy={
                    "version": "0.1",
                    "defaults": {"unknown_tools": "allow"},
                    "irreversible_tools": [
                        "payments.refund",
                        "jira.create_issue(commit)",
                        "jira.create_issue_commit",
                    ],
                    "approval": {"token_field": "confirmation_token"},
                },
            )
        )
        db.add(
            Run(
                run_id=run_id,
                project_id=project_id,
                trace_id=trace_id,
                campaign_id=campaign_id,
                policy_pack_id=policy_pack_id,
                status="queued",
                summary=None,
            )
        )
        db.commit()

    worker_module.execute_run(str(run_id))

    with worker_db_context() as db:
        attempt = db.execute(
            select(ReplayAttempt).where(ReplayAttempt.run_id == run_id)
        ).scalar_one()
        policy_event = db.execute(
            select(PolicyEvent).where(PolicyEvent.run_id == run_id)
        ).scalar_one()
        run = db.execute(select(Run).where(Run.run_id == run_id)).scalar_one()

    assert attempt.result == "failed"
    assert attempt.failure_reason == "policy_requires_approval"
    assert attempt.first_failure_tool == "payments.refund"

    assert policy_event.decision == "require_approval"
    assert policy_event.tool == "payments.refund"
    assert policy_event.event_index == 2
    assert "approval token" in (policy_event.reason or "")

    summary = run.summary or {}
    assert summary.get("policy_violations_total") == 1
    assert summary.get("policy_denies") == 0
    assert summary.get("policy_requires_approval") == 1
    assert summary.get("policy_events_count") == 1


def test_policy_pack_blocks_jira_commit_like_and_allows_draft(
    worker_db_context: sessionmaker[Session],
) -> None:
    project_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    policy_pack_id = uuid4()
    run_id = uuid4()

    with worker_db_context() as db:
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
                name="Jira Policy Campaign",
                mutation_set=[
                    {
                        "mutation_id": "jira-commit-without-token",
                        "tool": "jira.create_issue(commit)",
                        "args": {"title": "Committed issue"},
                    },
                    {
                        "mutation_id": "jira-draft",
                        "tool": "jira.create_issue",
                        "args": {"title": "Draft issue"},
                    },
                ],
                eval_set={"checks": ["status"]},
            )
        )
        db.add(
            PolicyPack(
                policy_pack_id=policy_pack_id,
                project_id=project_id,
                name="Jira Commit Policy",
                version="0.1.0",
                policy={
                    "version": "0.1",
                    "defaults": {"unknown_tools": "allow"},
                    "irreversible_tools": [
                        "payments.refund",
                        "jira.create_issue(commit)",
                        "jira.create_issue_commit",
                    ],
                    "approval": {"token_field": "confirmation_token"},
                },
            )
        )
        db.add(
            Run(
                run_id=run_id,
                project_id=project_id,
                trace_id=trace_id,
                campaign_id=campaign_id,
                policy_pack_id=policy_pack_id,
                status="queued",
                summary=None,
            )
        )
        db.commit()

    worker_module.execute_run(str(run_id))

    with worker_db_context() as db:
        attempts = list(
            db.scalars(
                select(ReplayAttempt)
                .where(ReplayAttempt.run_id == run_id)
                .order_by(ReplayAttempt.mutation_id.asc())
            )
        )
        policy_events = list(
            db.scalars(
                select(PolicyEvent)
                .where(PolicyEvent.run_id == run_id)
                .order_by(PolicyEvent.policy_event_id.asc())
            )
        )

    by_mutation = {attempt.mutation_id: attempt for attempt in attempts}
    assert by_mutation["jira-commit-without-token"].failure_reason == "policy_requires_approval"
    assert by_mutation["jira-commit-without-token"].result == "failed"
    assert by_mutation["jira-draft"].result == "passed"

    assert len(policy_events) == 2
    decision_by_tool = {event.tool: event.decision for event in policy_events}
    assert decision_by_tool["jira.create_issue(commit)"] == "require_approval"
    assert decision_by_tool["jira.create_issue"] == "allow"
