from __future__ import annotations

from collections.abc import Generator
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import worker as worker_module
from models import (
    Base,
    Campaign,
    HardeningTemplate,
    PolicyEvent,
    PolicyPack,
    PolicyPackVersion,
    ReplayAttempt,
    Run,
    RunTemplateLink,
    Trace,
)


class _FakeOPAResponse:
    def __init__(self, status_code: int, payload: object) -> None:
        self.status_code = status_code
        self._payload = payload

    def json(self) -> object:
        return self._payload


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
                engine="builtin",
                policy={
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
                        "package": "sepurux.policy",
                        "query": "data.sepurux.policy.decision",
                    },
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
    assert isinstance(policy_event.input, dict)
    assert policy_event.input["tool"]["name"] == "payments.refund"
    assert policy_event.input["context"]["run_id"] == str(run_id)
    assert policy_event.input["context"]["attempt_id"] == str(attempt.attempt_id)
    assert policy_event.input["context"]["project_id"] == str(project_id)
    assert policy_event.input["metadata"]["event_index"] == 2

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
                engine="builtin",
                policy={
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
                        "package": "sepurux.policy",
                        "query": "data.sepurux.policy.decision",
                    },
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


def test_policy_pack_allows_non_irreversible_tool(
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
                name="Allow Non-Irreversible",
                mutation_set=[
                    {
                        "mutation_id": "safe-jira-draft",
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
                name="Builtin Policy",
                engine="builtin",
                policy={
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

    assert attempt.result == "passed"
    assert attempt.failure_reason is None
    assert policy_event.decision == "allow"
    assert policy_event.tool == "jira.create_issue"


def test_policy_pack_template_auto_confirmation_token_allows_irreversible_tool(
    worker_db_context: sessionmaker[Session],
) -> None:
    project_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    run_id = uuid4()
    template_id = uuid4()

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
                name="Template Approval Auto Token",
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
            HardeningTemplate(
                template_id=template_id,
                project_id=project_id,
                name="Template: Confirmation Gate for payments.refund",
                type="policy_pack",
                config={
                    "source_attempt_id": str(uuid4()),
                    "target_tool": "payments.refund",
                    "auto_provide_confirmation_token": True,
                    "confirmation_token_value": "template-auto-confirmation-token",
                    "policy": {
                        "version": "0.1",
                        "defaults": {"unknown_tools": "allow"},
                        "approval": {"token_field": "confirmation_token"},
                        "irreversible": {"tools": ["payments.refund"]},
                    },
                },
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
        db.add(
            RunTemplateLink(
                run_id=run_id,
                template_id=template_id,
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

    assert attempt.result == "passed"
    assert attempt.failure_reason is None
    assert policy_event.decision == "allow"
    assert isinstance(policy_event.input, dict)
    assert (
        policy_event.input["tool"]["args"]["confirmation_token"]
        == "template-auto-confirmation-token"
    )
    summary = run.summary or {}
    assert summary.get("policy_requires_approval") == 0
    assert summary.get("policy_events_count") == 1


def test_policy_pack_template_legacy_confirmation_gate_still_injects_token(
    worker_db_context: sessionmaker[Session],
) -> None:
    project_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    run_id = uuid4()
    template_id = uuid4()

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
                name="Legacy Confirmation Gate Template",
                mutation_set=[
                    {
                        "mutation_id": "refund-without-token",
                        "tool": "payments.refund",
                        "args": {"order_id": "ord-legacy", "amount": 30},
                    }
                ],
                eval_set={"checks": ["status"]},
            )
        )
        db.add(
            HardeningTemplate(
                template_id=template_id,
                project_id=project_id,
                name="Template: Confirmation Gate for payments.refund",
                type="policy_pack",
                config={
                    "source_attempt_id": str(uuid4()),
                    "target_tool": "payments.refund",
                    "policy": {
                        "version": "0.1",
                        "defaults": {"unknown_tools": "allow"},
                        "approval": {"token_field": "confirmation_token"},
                        "irreversible": {"tools": ["payments.refund"]},
                    },
                },
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
        db.add(
            RunTemplateLink(
                run_id=run_id,
                template_id=template_id,
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

    assert attempt.result == "passed"
    assert attempt.failure_reason is None
    assert policy_event.decision == "allow"
    assert isinstance(policy_event.input, dict)
    assert (
        policy_event.input["tool"]["args"]["confirmation_token"]
        == "template-auto-confirmation-token"
    )


def test_opa_policy_pack_requires_approval_without_token(
    worker_db_context: sessionmaker[Session],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    project_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    policy_pack_id = uuid4()
    run_id = uuid4()

    def fake_opa_post(url: str, *, json: object, timeout: float) -> _FakeOPAResponse:
        assert url.endswith("/v1/data/sepurux/policy/decision")
        assert isinstance(json, dict)
        return _FakeOPAResponse(
            200,
            {
                "result": {
                    "decision": "require_approval",
                    "reason": "OPA requires approval for refunds",
                }
            },
        )

    monkeypatch.setattr("policy.opa_client.httpx.post", fake_opa_post)

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
                name="OPA Approval Campaign",
                mutation_set=[
                    {
                        "mutation_id": "refund-via-opa",
                        "tool": "payments.refund",
                        "args": {"order_id": "ord-123"},
                    }
                ],
                eval_set={"checks": ["status"]},
            )
        )
        db.add(
            PolicyPack(
                policy_pack_id=policy_pack_id,
                project_id=project_id,
                name="OPA Pack",
                engine="opa",
                policy={
                    "version": "0.1",
                    "defaults": {"unknown_tools": "allow"},
                    "approval": {"token_field": "confirmation_token"},
                    "irreversible": {"tools": ["payments.refund"]},
                    "opa": {
                        "package": "sepurux.policy",
                        "query": "data.sepurux.policy.decision",
                    },
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

    assert attempt.result == "failed"
    assert attempt.failure_reason == "policy_requires_approval"
    assert policy_event.decision == "require_approval"
    assert policy_event.tool == "payments.refund"
    assert "approval" in (policy_event.reason or "").lower()


def test_opa_policy_pack_allows_tool_when_opa_returns_allow(
    worker_db_context: sessionmaker[Session],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    project_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    policy_pack_id = uuid4()
    run_id = uuid4()

    def fake_opa_post(url: str, *, json: object, timeout: float) -> _FakeOPAResponse:
        assert url.endswith("/v1/data/sepurux/policy/decision")
        assert isinstance(json, dict)
        return _FakeOPAResponse(
            200,
            {
                "result": {
                    "decision": "allow",
                    "reason": "OPA allow",
                }
            },
        )

    monkeypatch.setattr("policy.opa_client.httpx.post", fake_opa_post)

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
                name="OPA Allow Campaign",
                mutation_set=[
                    {
                        "mutation_id": "jira-draft-via-opa",
                        "tool": "jira.create_issue",
                        "args": {"title": "Draft issue"},
                    }
                ],
                eval_set={"checks": ["status"]},
            )
        )
        db.add(
            PolicyPack(
                policy_pack_id=policy_pack_id,
                project_id=project_id,
                name="OPA Allow Pack",
                engine="opa",
                policy={
                    "version": "0.1",
                    "defaults": {"unknown_tools": "allow"},
                    "approval": {"token_field": "confirmation_token"},
                    "irreversible": {"tools": ["payments.refund"]},
                    "opa": {
                        "package": "sepurux.policy",
                        "query": "data.sepurux.policy.decision",
                    },
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

    assert attempt.result == "passed"
    assert attempt.failure_reason is None
    assert policy_event.decision == "allow"
    assert policy_event.tool == "jira.create_issue"


def test_opa_unavailable_fails_attempt_and_records_policy_event(
    worker_db_context: sessionmaker[Session],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    project_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    policy_pack_id = uuid4()
    run_id = uuid4()

    def fake_opa_post(url: str, *, json: object, timeout: float) -> _FakeOPAResponse:
        raise httpx.ConnectError(
            "opa down",
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr("policy.opa_client.httpx.post", fake_opa_post)

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
                name="OPA Down Campaign",
                mutation_set=[
                    {
                        "mutation_id": "refund-with-opa-down",
                        "tool": "payments.refund",
                        "args": {"order_id": "ord-123"},
                    }
                ],
                eval_set={"checks": ["status"]},
            )
        )
        db.add(
            PolicyPack(
                policy_pack_id=policy_pack_id,
                project_id=project_id,
                name="OPA Pack",
                engine="opa",
                policy={
                    "version": "0.1",
                    "defaults": {"unknown_tools": "allow"},
                    "approval": {"token_field": "confirmation_token"},
                    "irreversible": {"tools": ["payments.refund"]},
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

    assert attempt.result == "failed"
    assert attempt.failure_reason == "opa_unavailable"
    assert policy_event.decision == "deny"
    assert "opa unavailable" in (policy_event.reason or "")


def test_run_uses_snapshotted_policy_pack_version_when_active_changes(
    worker_db_context: sessionmaker[Session],
) -> None:
    project_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    policy_pack_id = uuid4()
    version_v1_id = uuid4()
    version_v2_id = uuid4()
    run_id = uuid4()

    policy_v1 = {
        "version": "0.1",
        "defaults": {"unknown_tools": "allow"},
        "approval": {"token_field": "confirmation_token"},
        "irreversible": {"tools": []},
    }
    policy_v2 = {
        "version": "0.2",
        "defaults": {"unknown_tools": "allow"},
        "approval": {"token_field": "confirmation_token"},
        "irreversible": {"tools": ["payments.refund"]},
    }

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
                name="Version Snapshot Campaign",
                mutation_set=[
                    {
                        "mutation_id": "refund-check",
                        "tool": "payments.refund",
                        "args": {"order_id": "ord-123"},
                    }
                ],
                eval_set={"checks": ["status"]},
            )
        )
        db.add(
            PolicyPack(
                policy_pack_id=policy_pack_id,
                project_id=project_id,
                name="Versioned Policy Pack",
                engine="builtin",
                policy=policy_v2,
                active_version_id=version_v2_id,
            )
        )
        db.add_all(
            [
                PolicyPackVersion(
                    version_id=version_v1_id,
                    policy_pack_id=policy_pack_id,
                    version_number=1,
                    policy=policy_v1,
                    created_by="test",
                ),
                PolicyPackVersion(
                    version_id=version_v2_id,
                    policy_pack_id=policy_pack_id,
                    version_number=2,
                    policy=policy_v2,
                    created_by="test",
                ),
            ]
        )
        db.add(
            Run(
                run_id=run_id,
                project_id=project_id,
                trace_id=trace_id,
                campaign_id=campaign_id,
                policy_pack_id=policy_pack_id,
                effective_policy_pack_version_id=version_v1_id,
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

    assert attempt.result == "passed"
    assert attempt.failure_reason is None
    assert policy_event.decision == "allow"
    assert policy_event.tool == "payments.refund"
    assert run.effective_policy_pack_version_id == version_v1_id


def test_run_fails_if_snapshotted_policy_pack_version_is_missing(
    worker_db_context: sessionmaker[Session],
) -> None:
    project_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    policy_pack_id = uuid4()
    run_id = uuid4()
    active_version_id = uuid4()
    missing_snapshot_version_id = uuid4()

    policy_v2 = {
        "version": "0.2",
        "defaults": {"unknown_tools": "allow"},
        "approval": {"token_field": "confirmation_token"},
        "irreversible": {"tools": ["payments.refund"]},
    }

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
                name="Missing Snapshot Campaign",
                mutation_set=[
                    {
                        "mutation_id": "refund-check",
                        "tool": "payments.refund",
                        "args": {"order_id": "ord-123"},
                    }
                ],
                eval_set={"checks": ["status"]},
            )
        )
        db.add(
            PolicyPack(
                policy_pack_id=policy_pack_id,
                project_id=project_id,
                name="Versioned Policy Pack",
                engine="builtin",
                policy=policy_v2,
                active_version_id=active_version_id,
            )
        )
        db.add(
            PolicyPackVersion(
                version_id=active_version_id,
                policy_pack_id=policy_pack_id,
                version_number=2,
                policy=policy_v2,
                created_by="test",
            )
        )
        db.add(
            Run(
                run_id=run_id,
                project_id=project_id,
                trace_id=trace_id,
                campaign_id=campaign_id,
                policy_pack_id=policy_pack_id,
                effective_policy_pack_version_id=missing_snapshot_version_id,
                status="queued",
                summary=None,
            )
        )
        db.commit()

    with pytest.raises(ValueError, match="Snapshotted policy pack version not found"):
        worker_module.execute_run(str(run_id))


def test_unknown_policy_engine_fails_closed_and_records_deny_event(
    worker_db_context: sessionmaker[Session],
) -> None:
    """An unrecognised policy engine name must deny (fail-closed), not allow."""
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
                name="Unknown Engine Campaign",
                mutation_set=[
                    {
                        "mutation_id": "refund-unknown-engine",
                        "tool": "payments.refund",
                        "args": {"order_id": "ord-999"},
                    }
                ],
                eval_set={"checks": ["status"]},
            )
        )
        db.add(
            PolicyPack(
                policy_pack_id=policy_pack_id,
                project_id=project_id,
                name="Unknown Engine Pack",
                engine="not_a_real_engine",
                policy={
                    "version": "0.1",
                    "defaults": {"unknown_tools": "allow"},
                    "approval": {"token_field": "confirmation_token"},
                    "irreversible": {"tools": []},
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

    assert attempt.result == "failed"
    assert attempt.failure_reason == "policy_engine_unknown"
    assert policy_event.decision == "deny"
    assert "not_a_real_engine" in (policy_event.reason or "")


def test_opa_4xx_response_fails_closed_and_records_policy_event(
    worker_db_context: sessionmaker[Session],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """OPA 4xx responses (OPAResponseError) must deny, not crash the run."""
    project_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    policy_pack_id = uuid4()
    run_id = uuid4()

    def fake_opa_post(url: str, *, json: object, timeout: float) -> _FakeOPAResponse:
        return _FakeOPAResponse(400, {"error": "bad request"})

    monkeypatch.setattr("policy.opa_client.httpx.post", fake_opa_post)

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
                name="OPA 4xx Campaign",
                mutation_set=[
                    {
                        "mutation_id": "refund-with-opa-4xx",
                        "tool": "payments.refund",
                        "args": {"order_id": "ord-400"},
                    }
                ],
                eval_set={"checks": ["status"]},
            )
        )
        db.add(
            PolicyPack(
                policy_pack_id=policy_pack_id,
                project_id=project_id,
                name="OPA 4xx Pack",
                engine="opa",
                policy={
                    "version": "0.1",
                    "defaults": {"unknown_tools": "allow"},
                    "approval": {"token_field": "confirmation_token"},
                    "irreversible": {"tools": []},
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

    assert attempt.result == "failed"
    assert attempt.failure_reason == "opa_response_error"
    assert policy_event.decision == "deny"
    assert "opa response error" in (policy_event.reason or "")
