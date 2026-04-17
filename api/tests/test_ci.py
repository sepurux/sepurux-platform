from __future__ import annotations

from collections.abc import Generator
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import (
    AuditEvent,
    Base,
    Campaign,
    GitHubIntegration,
    MutationPack,
    PolicyPack,
    PolicyPackVersion,
    Project,
    QualityContract,
    ReplayAttempt,
    Run,
    TenantControl,
    Trace,
    User,
)
from app.services.trace_replay_profile import enrich_normalized_trace_for_replay
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import seed_tenant_project_and_key


class FakeQueue:
    def __init__(self) -> None:
        self.calls: list[tuple[tuple[object, ...], dict[str, object]]] = []

    def enqueue(self, *args: object, **kwargs: object) -> object:
        self.calls.append((args, kwargs))
        return {"queued": True}


@pytest.fixture()
def ci_test_context(
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[tuple[TestClient, sessionmaker[Session], FakeQueue, UUID], None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    with testing_session_local() as db:
        _, project_id, _, _ = seed_tenant_project_and_key(db)

    fake_queue = FakeQueue()
    monkeypatch.setattr("app.services.run_service.get_run_queue", lambda: fake_queue)

    def override_get_db() -> Generator[Session, None, None]:
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        yield client, testing_session_local, fake_queue, project_id

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def _seed_trace_and_campaign(db: Session, *, project_id: UUID) -> tuple[UUID, UUID]:
    trace_id = uuid4()
    campaign_id = uuid4()
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
            name="Seed Campaign",
            mutation_set=[{"type": "noop"}],
            eval_set={"checks": ["status"]},
        )
    )
    db.commit()
    return trace_id, campaign_id


def test_ci_post_run_allows_when_ci_token_unset_and_stores_thresholds(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, fake_queue, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)

    with testing_session_local() as db:
        trace_id, campaign_id = _seed_trace_and_campaign(db, project_id=project_id)

    response = client.post(
        "/v1/ci/runs",
        json={
            "trace_id": str(trace_id),
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0, "max_failures": 2},
        },
    )

    assert response.status_code == 201
    payload = response.json()
    run_id = UUID(payload["run_id"])
    assert fake_queue.calls == [(("worker.execute_run", str(run_id)), {})]

    with testing_session_local() as db:
        row = db.execute(select(Run).where(Run.run_id == run_id)).scalar_one()
        assert row.project_id == project_id
        assert row.status == "queued"
        assert isinstance(row.summary, dict)
        assert row.summary.get("ci_thresholds") == {
            "min_pass_rate": 0.8,
            "max_unsafe": 0,
            "max_failures": 2,
        }
        assert row.summary.get("campaign_name") == "Seed Campaign"
        assert isinstance(row.summary.get("ci_batch_id"), str)


def test_ci_post_run_stores_github_context(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, _, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)

    with testing_session_local() as db:
        trace_id, campaign_id = _seed_trace_and_campaign(db, project_id=project_id)

    response = client.post(
        "/v1/ci/runs",
        json={
            "trace_id": str(trace_id),
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
            "repo": "sepurux/sepurux-platform",
            "pull_request_number": 97,
        },
    )

    assert response.status_code == 201
    run_id = UUID(response.json()["run_id"])
    with testing_session_local() as db:
        row = db.execute(select(Run).where(Run.run_id == run_id)).scalar_one()
        assert isinstance(row.summary, dict)
        assert row.summary.get("ci_thresholds") == {"min_pass_rate": 0.8, "max_unsafe": 0}
        assert row.summary.get("github_context") == {
            "repo": "sepurux/sepurux-platform",
            "pull_request_number": 97,
        }
        assert row.summary.get("campaign_name") == "Seed Campaign"
        assert isinstance(row.summary.get("ci_batch_id"), str)


def test_ci_post_run_reads_repo_and_pr_number_from_env(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, _, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)
    monkeypatch.setenv("GITHUB_REPO", "sepurux/sepurux-platform")
    monkeypatch.setenv("PR_NUMBER", "123")

    with testing_session_local() as db:
        trace_id, campaign_id = _seed_trace_and_campaign(db, project_id=project_id)

    response = client.post(
        "/v1/ci/runs",
        json={
            "trace_id": str(trace_id),
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
        },
    )

    assert response.status_code == 201
    run_id = UUID(response.json()["run_id"])
    with testing_session_local() as db:
        row = db.execute(select(Run).where(Run.run_id == run_id)).scalar_one()
        assert isinstance(row.summary, dict)
        assert row.summary.get("ci_thresholds") == {"min_pass_rate": 0.8, "max_unsafe": 0}
        assert row.summary.get("github_context") == {
            "repo": "sepurux/sepurux-platform",
            "pull_request_number": 123,
        }
        assert row.summary.get("campaign_name") == "Seed Campaign"
        assert isinstance(row.summary.get("ci_batch_id"), str)


def test_ci_post_run_returns_423_when_tenant_runs_paused(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, fake_queue, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)

    with testing_session_local() as db:
        trace_id, campaign_id = _seed_trace_and_campaign(db, project_id=project_id)
        project = db.scalar(select(Project).where(Project.project_id == project_id))
        assert isinstance(project, Project)
        db.add(
            TenantControl(
                tenant_id=project.tenant_id,
                runs_paused=True,
            )
        )
        db.commit()

    response = client.post(
        "/v1/ci/runs",
        json={
            "trace_id": str(trace_id),
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
        },
    )

    assert response.status_code == 423
    assert response.json() == {"detail": "Run creation is paused for this tenant."}
    assert fake_queue.calls == []


def test_ci_routes_require_ci_token_when_configured_but_not_api_key(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, _, _, _ = ci_test_context
    monkeypatch.setenv("CI_TOKEN", "secret-token")

    missing = client.get(f"/v1/ci/runs/{uuid4()}")
    assert missing.status_code == 401
    assert missing.json() == {"detail": "Invalid or missing X-Sepurux-Token header"}

    wrong = client.get(f"/v1/ci/runs/{uuid4()}", headers={"X-Sepurux-Token": "wrong"})
    assert wrong.status_code == 401
    assert wrong.json() == {"detail": "Invalid or missing X-Sepurux-Token header"}

    # Correct CI token should be sufficient even without X-API-Key/X-Project-Id.
    allowed = client.get(f"/v1/ci/runs/{uuid4()}", headers={"X-Sepurux-Token": "secret-token"})
    assert allowed.status_code == 404
    assert allowed.json() == {"detail": "Run not found"}


def test_get_ci_run_returns_pending_and_terminal_decisions_with_metrics(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, _, project_id = ci_test_context
    monkeypatch.setenv("CI_TOKEN", "secret-token")

    pending_run_id = uuid4()
    fail_run_id = uuid4()
    pass_run_id = uuid4()
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
                name="CI Campaign",
                mutation_set=[],
                eval_set=[],
            )
        )
        db.add_all(
            [
                Run(
                    run_id=pending_run_id,
                    project_id=project_id,
                    trace_id=trace_id,
                    campaign_id=campaign_id,
                    status="queued",
                    summary={"ci_thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0}},
                    created_at=datetime(2026, 2, 26, 12, 0, tzinfo=UTC),
                ),
                Run(
                    run_id=fail_run_id,
                    project_id=project_id,
                    trace_id=trace_id,
                    campaign_id=campaign_id,
                    status="failed",
                    summary={"ci_thresholds": {"min_pass_rate": 0.5, "max_unsafe": 0}},
                    created_at=datetime(2026, 2, 26, 12, 1, tzinfo=UTC),
                ),
                Run(
                    run_id=pass_run_id,
                    project_id=project_id,
                    trace_id=trace_id,
                    campaign_id=campaign_id,
                    status="completed",
                    summary={
                        "ci_thresholds": {
                            "min_pass_rate": 0.5,
                            "max_unsafe": 0,
                            "max_failures": 1,
                        }
                    },
                    created_at=datetime(2026, 2, 26, 12, 2, tzinfo=UTC),
                ),
            ]
        )
        db.add_all(
            [
                ReplayAttempt(
                    attempt_id=uuid4(),
                    project_id=project_id,
                    run_id=fail_run_id,
                    mutation_id="m1",
                    result="passed",
                    failure_reason=None,
                    first_failure_event_index=None,
                    first_failure_tool=None,
                    artifacts_s3_key=None,
                ),
                ReplayAttempt(
                    attempt_id=uuid4(),
                    project_id=project_id,
                    run_id=fail_run_id,
                    mutation_id="m2",
                    result="failed",
                    failure_reason="timeout",
                    first_failure_event_index=3,
                    first_failure_tool="jira.create_issue",
                    artifacts_s3_key=None,
                ),
                ReplayAttempt(
                    attempt_id=uuid4(),
                    project_id=project_id,
                    run_id=fail_run_id,
                    mutation_id="m3",
                    result="failed",
                    failure_reason="unsafe_tool_call",
                    first_failure_event_index=2,
                    first_failure_tool="github.delete_repo",
                    artifacts_s3_key=None,
                ),
                ReplayAttempt(
                    attempt_id=uuid4(),
                    project_id=project_id,
                    run_id=pass_run_id,
                    mutation_id="p1",
                    result="passed",
                    failure_reason=None,
                    first_failure_event_index=None,
                    first_failure_tool=None,
                    artifacts_s3_key=None,
                ),
                ReplayAttempt(
                    attempt_id=uuid4(),
                    project_id=project_id,
                    run_id=pass_run_id,
                    mutation_id="p2",
                    result="failed",
                    failure_reason="timeout",
                    first_failure_event_index=3,
                    first_failure_tool="slack.post_message",
                    artifacts_s3_key=None,
                ),
            ]
        )
        db.commit()

    headers = {"X-Sepurux-Token": "secret-token"}

    pending_response = client.get(f"/v1/ci/runs/{pending_run_id}", headers=headers)
    assert pending_response.status_code == 200
    pending_payload = pending_response.json()
    assert pending_payload["decision"] == "pending"
    assert pending_payload["pass_rate"] == 0.0
    assert pending_payload["unsafe_attempts"] == 0
    assert pending_payload["failures"] == 0
    assert pending_payload["top_failing_tools"] == []
    assert pending_payload["dashboard_url"].endswith(f"/runs/{pending_run_id}")

    fail_response = client.get(f"/v1/ci/runs/{fail_run_id}", headers=headers)
    assert fail_response.status_code == 200
    fail_payload = fail_response.json()
    assert fail_payload["status"] == "failed"
    assert fail_payload["decision"] == "fail"
    assert fail_payload["pass_rate"] == 0.3333
    assert fail_payload["unsafe_attempts"] == 1
    assert fail_payload["failures"] == 2
    assert [item["tool"] for item in fail_payload["top_failing_tools"]] == [
        "github.delete_repo",
        "jira.create_issue",
    ]
    assert all("pct" not in item for item in fail_payload["top_failing_tools"])

    pass_response = client.get(f"/v1/ci/runs/{pass_run_id}", headers=headers)
    assert pass_response.status_code == 200
    pass_payload = pass_response.json()
    assert pass_payload["status"] == "done"
    assert pass_payload["decision"] == "pass"
    assert pass_payload["pass_rate"] == 0.5
    assert pass_payload["unsafe_attempts"] == 0
    assert pass_payload["failures"] == 1
    assert pass_payload["top_failing_tools"][0]["tool"] == "slack.post_message"

    with testing_session_local() as db:
        decision_events = list(
            db.scalars(
                select(AuditEvent).where(
                    AuditEvent.project_id == project_id,
                    AuditEvent.event_type.in_(["ci.decision.fail", "ci.decision.pass"]),
                )
            )
        )
    decision_types = {event.event_type for event in decision_events}
    assert "ci.decision.fail" in decision_types
    assert "ci.decision.pass" in decision_types


def test_get_ci_run_enforces_mutation_category_thresholds(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, _, project_id = ci_test_context
    monkeypatch.setenv("CI_TOKEN", "secret-token")

    trace_id = uuid4()
    campaign_id = uuid4()
    run_fail_id = uuid4()
    run_pass_id = uuid4()
    weak_pack_id = uuid4()
    strong_pack_id = uuid4()

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
                name="CI Coverage Campaign",
                mutation_set=[],
                eval_set=[],
            )
        )
        db.add_all(
            [
                MutationPack(
                    mutation_pack_id=weak_pack_id,
                    project_id=project_id,
                    name="weak-fault-only",
                    config={
                        "version": "0.1",
                        "mutations": [
                            {"type": "fault.timeout", "target": {"tool": "payments.refund"}}
                        ],
                    },
                    coverage_score=20,
                ),
                MutationPack(
                    mutation_pack_id=strong_pack_id,
                    project_id=project_id,
                    name="strong-three-families",
                    config={
                        "version": "0.1",
                        "mutations": [
                            {"type": "schema.drop_field", "target": {"tool": "payments.refund"}},
                            {"type": "fault.timeout", "target": {"tool": "payments.refund"}},
                            {"type": "latency_delay", "target": {"tool": "payments.refund"}},
                        ],
                    },
                    coverage_score=60,
                ),
            ]
        )
        db.add_all(
            [
                Run(
                    run_id=run_fail_id,
                    project_id=project_id,
                    trace_id=trace_id,
                    campaign_id=campaign_id,
                    mutation_pack_id=weak_pack_id,
                    status="completed",
                    summary={
                        "ci_thresholds": {
                            "min_pass_rate": 0.5,
                            "max_unsafe": 0,
                            "min_mutation_categories": 3,
                            "required_mutation_categories": ["schema", "fault", "latency"],
                        }
                    },
                ),
                Run(
                    run_id=run_pass_id,
                    project_id=project_id,
                    trace_id=trace_id,
                    campaign_id=campaign_id,
                    mutation_pack_id=strong_pack_id,
                    status="completed",
                    summary={
                        "ci_thresholds": {
                            "min_pass_rate": 0.5,
                            "max_unsafe": 0,
                            "min_mutation_categories": 3,
                            "required_mutation_categories": ["schema", "fault", "latency"],
                        }
                    },
                ),
            ]
        )
        db.add_all(
            [
                ReplayAttempt(
                    attempt_id=uuid4(),
                    project_id=project_id,
                    run_id=run_fail_id,
                    mutation_id="weak-1",
                    result="passed",
                    failure_reason=None,
                    first_failure_event_index=None,
                    first_failure_tool=None,
                    artifacts_s3_key=None,
                ),
                ReplayAttempt(
                    attempt_id=uuid4(),
                    project_id=project_id,
                    run_id=run_pass_id,
                    mutation_id="strong-1",
                    result="passed",
                    failure_reason=None,
                    first_failure_event_index=None,
                    first_failure_tool=None,
                    artifacts_s3_key=None,
                ),
            ]
        )
        db.commit()

    headers = {"X-Sepurux-Token": "secret-token"}

    fail_response = client.get(f"/v1/ci/runs/{run_fail_id}", headers=headers)
    assert fail_response.status_code == 200
    fail_payload = fail_response.json()
    assert fail_payload["decision"] == "fail"
    assert fail_payload["mutation_categories"] == ["fault"]
    assert fail_payload["mutation_coverage_score"] == 20

    pass_response = client.get(f"/v1/ci/runs/{run_pass_id}", headers=headers)
    assert pass_response.status_code == 200
    pass_payload = pass_response.json()
    assert pass_payload["decision"] == "pass"
    assert set(pass_payload["mutation_categories"]) == {"schema", "fault", "latency"}
    assert pass_payload["mutation_coverage_score"] == 60


def test_get_ci_run_posts_github_report_once_with_warning_and_failure_status(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, _, project_id = ci_test_context
    monkeypatch.setenv("CI_TOKEN", "secret-token")
    monkeypatch.setenv("GITHUB_TOKEN", "fallback-env-token")

    comment_calls: list[dict[str, object]] = []
    status_calls: list[dict[str, object]] = []

    def fake_post_pr_comment(
        repo: str,
        pr_number: int,
        body: str,
        *,
        access_token: str | None = None,
    ) -> dict[str, object]:
        comment_calls.append(
            {
                "repo": repo,
                "pr_number": pr_number,
                "body": body,
                "access_token": access_token,
            }
        )
        return {"html_url": "https://github.com/sepurux/sepurux-platform/pull/97#issuecomment-1"}

    def fake_set_pr_status(
        repo: str,
        pr_number: int,
        *,
        passed: bool,
        description: str,
        target_url: str,
        access_token: str | None = None,
    ) -> dict[str, object]:
        status_calls.append(
            {
                "repo": repo,
                "pr_number": pr_number,
                "passed": passed,
                "description": description,
                "target_url": target_url,
                "access_token": access_token,
            }
        )
        return {"url": "https://api.github.com/repos/sepurux/sepurux-platform/statuses/abc"}

    monkeypatch.setattr("app.routes.ci.post_pr_comment", fake_post_pr_comment)
    monkeypatch.setattr("app.routes.ci.set_pr_status", fake_set_pr_status)

    run_id = uuid4()
    trace_id = uuid4()
    campaign_id = uuid4()
    owner_id = uuid4()

    with testing_session_local() as db:
        db.add(User(user_id=owner_id, email=f"owner-{owner_id}@example.com"))
        project = db.scalar(select(Project).where(Project.project_id == project_id))
        assert isinstance(project, Project)
        project.owner_id = owner_id
        db.add(project)

        db.add(
            GitHubIntegration(
                id=uuid4(),
                user_id=owner_id,
                repo="sepurux/sepurux-platform",
                installation_id=101,
                access_token="integration-token",
            )
        )
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
                name="CI Campaign",
                mutation_set=[],
                eval_set=[],
            )
        )
        db.add(
            Run(
                run_id=run_id,
                project_id=project_id,
                trace_id=trace_id,
                campaign_id=campaign_id,
                status="completed",
                summary={
                    "ci_thresholds": {
                        "min_pass_rate": 0.5,
                        "max_unsafe": 0,
                        "min_reliability_score": 80,
                    },
                    "github_context": {
                        "repo": "sepurux/sepurux-platform",
                        "pull_request_number": 97,
                    },
                    "reliability_score": 72.0,
                },
                created_at=datetime(2026, 2, 26, 12, 2, tzinfo=UTC),
            )
        )
        db.add(
            ReplayAttempt(
                attempt_id=uuid4(),
                project_id=project_id,
                run_id=run_id,
                mutation_id="m1",
                result="failed",
                failure_reason="timeout",
                first_failure_event_index=3,
                first_failure_tool="github.create_pr",
                artifacts_s3_key=None,
            )
        )
        db.commit()

    headers = {"X-Sepurux-Token": "secret-token"}

    first_response = client.get(f"/v1/ci/runs/{run_id}", headers=headers)
    assert first_response.status_code == 200
    assert len(comment_calls) == 1
    assert len(status_calls) == 1
    assert comment_calls[0]["access_token"] == "integration-token"
    assert status_calls[0]["access_token"] == "integration-token"
    assert status_calls[0]["passed"] is False
    assert "⚠️ This PR reduces AI reliability" in str(comment_calls[0]["body"])
    assert "github.create_pr" in str(comment_calls[0]["body"])

    second_response = client.get(f"/v1/ci/runs/{run_id}", headers=headers)
    assert second_response.status_code == 200
    assert len(comment_calls) == 1
    assert len(status_calls) == 1

    with testing_session_local() as db:
        row = db.scalar(select(Run).where(Run.run_id == run_id))
        assert isinstance(row, Run)
        assert isinstance(row.summary, dict)
        reporting = row.summary.get("github_reporting")
        assert isinstance(reporting, dict)
        assert reporting.get("comment_posted") is True
        assert reporting.get("status_set") is True


def test_ci_run_auto_applies_bootstrap_policy(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """CI runs must auto-apply the default bootstrap policy pack when present."""
    client, testing_session_local, _, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)

    pack_id = uuid4()
    version_id = uuid4()

    with testing_session_local() as db:
        trace_id, campaign_id = _seed_trace_and_campaign(db, project_id=project_id)
        pack = PolicyPack(
            policy_pack_id=pack_id,
            project_id=project_id,
            name="trace.bootstrap.default",
            engine="builtin",
            policy={"rules": []},
        )
        db.add(pack)
        db.flush()
        version = PolicyPackVersion(
            version_id=version_id,
            policy_pack_id=pack_id,
            version_number=1,
            policy={"rules": []},
        )
        db.add(version)
        db.flush()
        pack.active_version_id = version_id
        db.add(pack)
        db.commit()

    response = client.post(
        "/v1/ci/runs",
        json={
            "trace_id": str(trace_id),
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
        },
    )

    assert response.status_code == 201
    run_id = UUID(response.json()["run_id"])
    with testing_session_local() as db:
        row = db.scalar(select(Run).where(Run.run_id == run_id))
        assert isinstance(row, Run)
        assert row.policy_pack_id == pack_id
        assert row.effective_policy_pack_version_id == version_id


def test_ci_run_refreshes_bootstrap_policy_from_eval_traces(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, _, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)

    trace_id = uuid4()
    campaign_id = uuid4()
    pack_id = uuid4()
    stale_version_id = uuid4()

    normalized_payload = {
        "trace_version": "0.2",
        "source": "sdk",
        "events": [
            {"index": 1, "type": "tool_call", "tool": "search_docs", "args": {"q": "incident"}},
            {"index": 2, "type": "tool_result", "tool": "search_docs", "result": {"ok": True}},
            {
                "index": 3,
                "type": "tool_call",
                "tool": "create_ticket",
                "args": {"title": "alert"},
            },
            {
                "index": 4,
                "type": "tool_result",
                "tool": "create_ticket",
                "result": {"ok": True},
            },
        ],
    }

    with testing_session_local() as db:
        db.add(
            Trace(
                trace_id=trace_id,
                project_id=project_id,
                source="test",
                s3_key=f"traces/{trace_id}.json",
                normalized_payload=normalized_payload,
            )
        )
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                name="Trace-Synced CI Campaign",
                mutation_set=[{"type": "noop"}],
                eval_set={"checks": ["status"], "trace_ids": [str(trace_id)]},
            )
        )
        pack = PolicyPack(
            policy_pack_id=pack_id,
            project_id=project_id,
            name="trace.bootstrap.default",
            engine="builtin",
            policy={"version": "0.1", "defaults": {"unknown_tools": "deny"}, "rules": []},
        )
        db.add(pack)
        db.flush()
        db.add(
            PolicyPackVersion(
                version_id=stale_version_id,
                policy_pack_id=pack_id,
                version_number=1,
                policy={"version": "0.1", "defaults": {"unknown_tools": "deny"}, "rules": []},
            )
        )
        db.flush()
        pack.active_version_id = stale_version_id
        db.add(pack)
        db.commit()

    response = client.post(
        "/v1/ci/runs",
        json={
            "trace_id": str(trace_id),
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
        },
    )

    assert response.status_code == 201
    run_id = UUID(response.json()["run_id"])

    with testing_session_local() as db:
        run = db.scalar(select(Run).where(Run.run_id == run_id))
        assert isinstance(run, Run)
        assert run.policy_pack_id == pack_id
        assert isinstance(run.effective_policy_pack_version_id, UUID)
        assert run.effective_policy_pack_version_id != stale_version_id

        active_version = db.scalar(
            select(PolicyPackVersion).where(
                PolicyPackVersion.version_id == run.effective_policy_pack_version_id
            )
        )
        assert isinstance(active_version, PolicyPackVersion)
        assert active_version.version_number == 2
        assert isinstance(active_version.policy, dict)

        rules = active_version.policy.get("rules")
        assert isinstance(rules, list)
        rule_tools = {
            rule.get("match", {}).get("tool")
            for rule in rules
            if isinstance(rule, dict) and isinstance(rule.get("match"), dict)
        }
        assert "search_docs" in rule_tools
        assert "create_ticket" in rule_tools
        assert active_version.policy.get("defaults") == {"unknown_tools": "deny"}


def test_ci_run_no_bootstrap_policy_leaves_policy_unset(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """CI runs without a bootstrap policy pack leave policy fields null."""
    client, testing_session_local, _, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)

    with testing_session_local() as db:
        trace_id, campaign_id = _seed_trace_and_campaign(db, project_id=project_id)

    response = client.post(
        "/v1/ci/runs",
        json={
            "trace_id": str(trace_id),
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
        },
    )

    assert response.status_code == 201
    run_id = UUID(response.json()["run_id"])
    with testing_session_local() as db:
        row = db.scalar(select(Run).where(Run.run_id == run_id))
        assert isinstance(row, Run)
        assert row.policy_pack_id is None
        assert row.effective_policy_pack_version_id is None


def _seed_campaign_with_eval_traces(
    db: Session,
    *,
    project_id: UUID,
    trace_count: int = 2,
    min_scenarios: int | None = None,
) -> tuple[list[UUID], UUID]:
    """Seed N traces and one campaign whose eval_set.trace_ids lists them all."""
    trace_ids: list[UUID] = []
    for _ in range(trace_count):
        tid = uuid4()
        db.add(
            Trace(
                trace_id=tid,
                project_id=project_id,
                source="test",
                s3_key=f"traces/{tid}.json",
            )
        )
        trace_ids.append(tid)

    eval_set: dict = {"checks": ["status"], "trace_ids": [str(t) for t in trace_ids]}
    if min_scenarios is not None:
        eval_set["min_scenarios"] = min_scenarios

    campaign_id = uuid4()
    db.add(
        Campaign(
            campaign_id=campaign_id,
            project_id=project_id,
            name="Multi-Trace Campaign",
            mutation_set=[{"type": "noop"}],
            eval_set=eval_set,
        )
    )
    db.commit()
    return trace_ids, campaign_id


def _seed_campaign_with_tool_trace(
    db: Session,
    *,
    project_id: UUID,
    tool: str,
    with_confirmation_token: bool,
) -> tuple[UUID, UUID]:
    trace_id = uuid4()
    campaign_id = uuid4()
    db.add(
        Trace(
            trace_id=trace_id,
            project_id=project_id,
            source="test",
            normalized_payload={
                "events": [
                    {"type": "tool_call", "tool": tool, "args": {"input": "x"}},
                    {"type": "tool_result", "tool": tool, "output": {"ok": True}},
                ]
            },
            s3_key=f"traces/{trace_id}.json",
        )
    )
    mutation_args: dict[str, object] = {"amount": 100}
    if with_confirmation_token:
        mutation_args["confirmation_token"] = "ok"
    db.add(
        Campaign(
            campaign_id=campaign_id,
            project_id=project_id,
            name="Preflight Tool Campaign",
            mutation_set=[
                {
                    "mutation_id": "tool-write-check",
                    "tool": tool,
                    "args": mutation_args,
                }
            ],
            eval_set={"checks": ["status"], "trace_ids": [str(trace_id)]},
        )
    )
    db.commit()
    return trace_id, campaign_id


def test_ci_post_run_uses_eval_set_trace_ids_batch(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When eval_set.trace_ids has multiple traces, POST /ci/runs creates one run per trace."""
    client, testing_session_local, fake_queue, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)

    with testing_session_local() as db:
        trace_ids, campaign_id = _seed_campaign_with_eval_traces(
            db, project_id=project_id, trace_count=3
        )

    response = client.post(
        "/v1/ci/runs",
        json={
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["trace_count"] == 3
    assert len(payload["run_ids"]) == 3
    assert payload["run_id"] == payload["run_ids"][0]
    # 3 runs should have been enqueued
    assert len(fake_queue.calls) == 3

    # Each run should have a ci_batch_id in its summary
    with testing_session_local() as db:
        runs = db.scalars(select(Run)).all()
        batch_ids = {r.summary.get("ci_batch_id") for r in runs if isinstance(r.summary, dict)}
        assert len(batch_ids) == 1  # all share the same batch_id
        batch_id = batch_ids.pop()
        assert batch_id is not None
        run_trace_ids = {str(r.trace_id) for r in runs}
        assert run_trace_ids == {str(t) for t in trace_ids}


def test_ci_post_run_scopes_mutation_set_to_each_trace_tools(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, _, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)

    refund_trace_id = uuid4()
    security_trace_id = uuid4()
    dispatch_trace_id = uuid4()
    campaign_id = uuid4()

    with testing_session_local() as db:
        db.add_all(
            [
                Trace(
                    trace_id=refund_trace_id,
                    project_id=project_id,
                    source="test",
                    normalized_payload={
                        "events": [
                            {"type": "tool_call", "tool": "payments.refund", "args": {"amount": 10}},
                            {"type": "tool_result", "tool": "payments.refund", "result": {"ok": True}},
                        ]
                    },
                    s3_key=f"traces/{refund_trace_id}.json",
                ),
                Trace(
                    trace_id=security_trace_id,
                    project_id=project_id,
                    source="test",
                    normalized_payload={
                        "events": [
                            {"type": "tool_call", "tool": "iam.revoke_token", "args": {"token_id": "tok-1"}},
                            {"type": "tool_result", "tool": "iam.revoke_token", "result": {"ok": True}},
                        ]
                    },
                    s3_key=f"traces/{security_trace_id}.json",
                ),
                Trace(
                    trace_id=dispatch_trace_id,
                    project_id=project_id,
                    source="test",
                    normalized_payload={
                        "events": [
                            {"type": "tool_call", "tool": "dispatch.create_visit", "args": {"slot": "2026-04-02T12:00:00Z"}},
                            {"type": "tool_result", "tool": "dispatch.create_visit", "result": {"ok": True}},
                        ]
                    },
                    s3_key=f"traces/{dispatch_trace_id}.json",
                ),
                Campaign(
                    campaign_id=campaign_id,
                    project_id=project_id,
                    name="Scoped Batch Campaign",
                    mutation_set=[
                        {
                            "mutation_id": "refund",
                            "tool": "payments.refund",
                            "args": {"amount": 10, "confirmation_token": "approved"},
                        },
                        {
                            "mutation_id": "security",
                            "tool": "iam.revoke_token",
                            "args": {"token_id": "tok-1", "confirmation_token": "approved"},
                        },
                        {
                            "mutation_id": "dispatch",
                            "tool": "dispatch.create_visit",
                            "args": {
                                "slot": "2026-04-02T12:00:00Z",
                                "confirmation_token": "approved",
                            },
                        },
                    ],
                    eval_set={
                        "checks": ["status"],
                        "trace_ids": [
                            str(refund_trace_id),
                            str(security_trace_id),
                            str(dispatch_trace_id),
                        ],
                    },
                ),
            ]
        )
        db.commit()

    response = client.post(
        "/v1/ci/runs",
        json={
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
        },
    )

    assert response.status_code == 201

    expected_tools = {
        str(refund_trace_id): "payments.refund",
        str(security_trace_id): "iam.revoke_token",
        str(dispatch_trace_id): "dispatch.create_visit",
    }
    with testing_session_local() as db:
        runs = db.scalars(select(Run).order_by(Run.created_at.asc(), Run.run_id.asc())).all()
        assert len(runs) == 3
        for run in runs:
            assert isinstance(run.summary, dict)
            resolved = run.summary.get("resolved_mutation_set")
            assert isinstance(resolved, list)
            assert len(resolved) == 1
            assert resolved[0]["tool"] == expected_tools[str(run.trace_id)]


def test_ci_post_run_falls_back_to_trace_profile_when_campaign_mutations_do_not_match_trace(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, _, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)

    refund_trace_id = uuid4()
    revoke_trace_id = uuid4()
    campaign_id = uuid4()

    with testing_session_local() as db:
        db.add_all(
            [
                Trace(
                    trace_id=refund_trace_id,
                    project_id=project_id,
                    source="test",
                    normalized_payload={
                        "events": [
                            {
                                "type": "tool_call",
                                "tool": "payments.refund",
                                "args": {"payment_id": "pay_1", "amount": 120},
                            },
                            {
                                "type": "tool_result",
                                "tool": "payments.refund",
                                "result": {"ok": True},
                            },
                        ]
                    },
                    s3_key=f"traces/{refund_trace_id}.json",
                ),
                Trace(
                    trace_id=revoke_trace_id,
                    project_id=project_id,
                    source="test",
                    normalized_payload={
                        "events": [
                            {
                                "type": "tool_call",
                                "tool": "iam.revoke_token",
                                "args": {"token_id": "tok_1"},
                            },
                            {
                                "type": "tool_result",
                                "tool": "iam.revoke_token",
                                "result": {"ok": True},
                            },
                        ]
                    },
                    s3_key=f"traces/{revoke_trace_id}.json",
                ),
                Campaign(
                    campaign_id=campaign_id,
                    project_id=project_id,
                    name="Mixed Scenario Campaign",
                    mutation_set=[
                        {
                            "mutation_id": "refund",
                            "tool": "payments.refund",
                            "args": {
                                "payment_id": "pay_1",
                                "amount": 120,
                                "confirmation_token": "approved",
                            },
                        }
                    ],
                    eval_set={
                        "checks": ["status"],
                        "trace_ids": [str(refund_trace_id), str(revoke_trace_id)],
                    },
                ),
            ]
        )
        db.commit()

    response = client.post(
        "/v1/ci/runs",
        json={
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
        },
    )
    assert response.status_code == 201

    with testing_session_local() as db:
        runs = db.scalars(select(Run).order_by(Run.created_at.asc(), Run.run_id.asc())).all()
        assert len(runs) == 2

        resolved_by_trace: dict[str, list[dict[str, object]]] = {}
        for run in runs:
            assert isinstance(run.summary, dict)
            resolved = run.summary.get("resolved_mutation_set")
            assert isinstance(resolved, list)
            assert len(resolved) == 1
            resolved_by_trace[str(run.trace_id)] = resolved

    assert resolved_by_trace[str(refund_trace_id)][0]["tool"] == "payments.refund"
    assert resolved_by_trace[str(revoke_trace_id)][0]["tool"] == "iam.revoke_token"
    assert resolved_by_trace[str(revoke_trace_id)][0]["mutation_id"] == "baseline.iam.revoke_token"


def test_ci_post_run_reuses_same_replay_seed_basis_for_same_trace_and_config(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, fake_queue, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)

    trace_id = uuid4()
    campaign_id = uuid4()

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
                    ]
                },
                s3_key=f"traces/{trace_id}.json",
            )
        )
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                name="Stable CI Campaign",
                mutation_set=[
                    {
                        "mutation_id": "refund",
                        "tool": "payments.refund",
                        "args": {"payment_id": "pay_1", "confirmation_token": "approved"},
                    },
                    {
                        "mutation_id": "dispatch",
                        "tool": "dispatch.create_visit",
                        "args": {"slot": "2026-04-02T12:00:00Z", "confirmation_token": "approved"},
                    },
                ],
                eval_set={"checks": ["status"]},
            )
        )
        db.commit()

    payload = {
        "trace_id": str(trace_id),
        "campaign_id": str(campaign_id),
        "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
    }

    first_response = client.post("/v1/ci/runs", json=payload)
    second_response = client.post("/v1/ci/runs", json=payload)

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert len(fake_queue.calls) == 2

    with testing_session_local() as db:
        runs = list(db.scalars(select(Run).order_by(Run.created_at.asc(), Run.run_id.asc())))

    assert len(runs) == 2
    replay_seed_bases: set[str] = set()
    for run in runs:
        assert isinstance(run.summary, dict)
        resolved = run.summary.get("resolved_mutation_set")
        assert isinstance(resolved, list)
        assert len(resolved) == 1
        assert resolved[0]["tool"] == "payments.refund"
        replay_seed_basis = run.summary.get("replay_seed_basis")
        assert isinstance(replay_seed_basis, str)
        replay_seed_bases.add(replay_seed_basis)

    assert len(replay_seed_bases) == 1


def test_ci_post_run_infers_trace_hardening_from_retry_and_schema_events(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, _, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)

    trace_id = uuid4()
    campaign_id = uuid4()

    with testing_session_local() as db:
        db.add(
            Trace(
                trace_id=trace_id,
                project_id=project_id,
                source="test",
                normalized_payload={
                    "events": [
                        {"type": "tool_call", "tool": "payments.refund", "args": {"payment_id": "pay_1"}},
                        {"type": "error", "tool": "payments.refund", "error": {"type": "RateLimitError"}},
                        {"type": "retry", "tool": "payments.refund", "result": {"attempt": 2, "backoff_ms": 900}},
                        {
                            "type": "tool_call",
                            "tool": "payments.refund",
                            "args": {"payment_id": "pay_1", "retry_count": 1},
                        },
                        {"type": "error", "tool": "payments.refund", "error": {"type": "TimeoutError"}},
                        {"type": "retry", "tool": "payments.refund", "result": {"attempt": 3, "backoff_ms": 1800}},
                        {
                            "type": "tool_call",
                            "tool": "payments.refund",
                            "args": {"payment_id": "pay_1", "retry_count": 2},
                        },
                        {"type": "error", "tool": "payments.refund", "error": {"type": "RateLimitError"}},
                        {"type": "retry", "tool": "payments.refund", "result": {"attempt": 4, "backoff_ms": 2700}},
                        {
                            "type": "tool_call",
                            "tool": "payments.refund",
                            "args": {"payment_id": "pay_1", "retry_count": 3},
                        },
                        {
                            "type": "tool_result",
                            "tool": "payments.refund",
                            "result": {"state": "succeeded", "refund_id": "rf_1"},
                        },
                        {
                            "type": "agent_output",
                            "name": "refund_normalized",
                            "result": {"source_field": "state", "normalized_status": "succeeded"},
                        },
                    ]
                },
                s3_key=f"traces/{trace_id}.json",
            )
        )
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                name="Trace Hardening Campaign",
                mutation_set=[
                    {
                        "mutation_id": "refund",
                        "tool": "payments.refund",
                        "args": {"payment_id": "pay_1", "confirmation_token": "approved"},
                    }
                ],
                eval_set={"checks": ["status"]},
            )
        )
        db.commit()

    response = client.post(
        "/v1/ci/runs",
        json={
            "trace_id": str(trace_id),
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
        },
    )

    assert response.status_code == 201
    run_id = UUID(response.json()["run_id"])

    with testing_session_local() as db:
        run = db.execute(select(Run).where(Run.run_id == run_id)).scalar_one()

    assert isinstance(run.summary, dict)
    assert run.summary.get("trace_hardening") == {
        "retry_policy": {"max_retries": 3, "backoff_ms": 2700},
        "schema_adapter": {"mappings": {"status": "state"}},
        "source": "trace_inference_v1",
    }


def test_ci_post_run_uses_required_tool_coverage_as_baseline_fallback(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, _, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)

    trace_id = uuid4()
    campaign_id = uuid4()
    contract_id = uuid4()

    with testing_session_local() as db:
        db.add(
            Trace(
                trace_id=trace_id,
                project_id=project_id,
                source="test",
                normalized_payload={
                    "events": [
                        {
                            "type": "tool_call",
                            "tool": "payments.refund",
                            "args": {"payment_id": "pay_1", "amount": 120},
                        },
                        {
                            "type": "tool_result",
                            "tool": "payments.refund",
                            "result": {"status": "succeeded"},
                        },
                    ]
                },
                s3_key=f"traces/{trace_id}.json",
            )
        )
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                name="Contract Fallback Campaign",
                mutation_set=[{"mutation_id": "baseline"}],
                eval_set={"checks": ["status"]},
            )
        )
        db.add(
            QualityContract(
                contract_id=contract_id,
                project_id=project_id,
                campaign_id=campaign_id,
                required_pack_ids=[],
                required_tools=["payments.refund"],
                min_attempts_per_pack=1,
                version=1,
            )
        )
        db.commit()

    response = client.post(
        "/v1/ci/runs",
        json={
            "trace_id": str(trace_id),
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
        },
    )

    assert response.status_code == 201
    run_id = UUID(response.json()["run_id"])

    with testing_session_local() as db:
        run = db.execute(select(Run).where(Run.run_id == run_id)).scalar_one()

    assert isinstance(run.summary, dict)
    resolved = run.summary.get("resolved_mutation_set")
    assert isinstance(resolved, list)
    assert resolved == [
        {
            "mutation_id": "baseline.payments.refund",
            "tool": "payments.refund",
            "args": {
                "payment_id": "pay_1",
                "amount": 120,
                "confirmation_token": "approved",
            },
        }
    ]


def test_ci_post_run_uses_upload_time_primary_replay_profile_for_placeholder_baseline(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, _, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)

    trace_id = uuid4()
    campaign_id = uuid4()

    with testing_session_local() as db:
        db.add(
            Trace(
                trace_id=trace_id,
                project_id=project_id,
                source="test",
                normalized_payload=enrich_normalized_trace_for_replay(
                    {
                        "events": [
                            {
                                "type": "tool_call",
                                "tool": "orders.lookup",
                                "args": {"order_id": "ord_1"},
                            },
                            {
                                "type": "tool_call",
                                "tool": "payments.refund",
                                "args": {"payment_id": "pay_1", "amount": 120},
                            },
                            {
                                "type": "tool_call",
                                "tool": "notifications.send_email",
                                "args": {"to": "user@example.com"},
                            },
                        ]
                    }
                ),
                s3_key=f"traces/{trace_id}.json",
            )
        )
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                name="Upload Replay Profile Campaign",
                mutation_set=[{"mutation_id": "baseline"}],
                eval_set={"checks": ["status"]},
            )
        )
        db.commit()

    response = client.post(
        "/v1/ci/runs",
        json={
            "trace_id": str(trace_id),
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
        },
    )

    assert response.status_code == 201
    run_id = UUID(response.json()["run_id"])

    with testing_session_local() as db:
        run = db.execute(select(Run).where(Run.run_id == run_id)).scalar_one()

    assert isinstance(run.summary, dict)
    resolved = run.summary.get("resolved_mutation_set")
    assert isinstance(resolved, list)
    assert len(resolved) == 3
    assert resolved[0]["tool"] == "payments.refund"
    resolved_tools = {item["tool"] for item in resolved if isinstance(item, dict) and "tool" in item}
    assert resolved_tools == {
        "orders.lookup",
        "payments.refund",
        "notifications.send_email",
    }


def test_ci_post_run_prefers_uploaded_primary_mutation_over_required_tool_coverage(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, _, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)

    trace_id = uuid4()
    campaign_id = uuid4()
    contract_id = uuid4()

    with testing_session_local() as db:
        db.add(
            Trace(
                trace_id=trace_id,
                project_id=project_id,
                source="test",
                normalized_payload=enrich_normalized_trace_for_replay(
                    {
                        "events": [
                            {
                                "type": "tool_call",
                                "tool": "orders.lookup",
                                "args": {"order_id": "ord_1"},
                            },
                            {
                                "type": "tool_call",
                                "tool": "payments.refund",
                                "args": {"payment_id": "pay_1", "amount": 120},
                            },
                            {
                                "type": "tool_call",
                                "tool": "notifications.send_email",
                                "args": {"to": "user@example.com"},
                            },
                        ]
                    }
                ),
                s3_key=f"traces/{trace_id}.json",
            )
        )
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                name="Primary Replay Profile Campaign",
                mutation_set=[{"mutation_id": "baseline"}],
                eval_set={"checks": ["status"]},
            )
        )
        db.add(
            QualityContract(
                contract_id=contract_id,
                project_id=project_id,
                campaign_id=campaign_id,
                required_pack_ids=[],
                required_tools=[
                    "orders.lookup",
                    "payments.refund",
                    "notifications.send_email",
                ],
                min_attempts_per_pack=1,
                version=1,
            )
        )
        db.commit()

    response = client.post(
        "/v1/ci/runs",
        json={
            "trace_id": str(trace_id),
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
        },
    )

    assert response.status_code == 201
    run_id = UUID(response.json()["run_id"])

    with testing_session_local() as db:
        run = db.execute(select(Run).where(Run.run_id == run_id)).scalar_one()

    assert isinstance(run.summary, dict)
    resolved = run.summary.get("resolved_mutation_set")
    assert isinstance(resolved, list)
    assert len(resolved) == 3
    assert resolved[0]["tool"] == "payments.refund"
    resolved_tools = {item["tool"] for item in resolved if isinstance(item, dict) and "tool" in item}
    assert resolved_tools == {
        "orders.lookup",
        "payments.refund",
        "notifications.send_email",
    }


def test_ci_preflight_treats_contract_pack_preference_as_warning_only(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, _, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)

    trace_id = uuid4()
    campaign_id = uuid4()
    with testing_session_local() as db:
        db.add(
            Trace(
                trace_id=trace_id,
                project_id=project_id,
                source="test",
                normalized_payload={
                    "events": [
                        {
                            "type": "tool_call",
                            "tool": "orders.lookup",
                            "args": {"order_id": "ord_1"},
                        },
                        {
                            "type": "tool_result",
                            "tool": "orders.lookup",
                            "result": {"ok": True},
                        },
                    ]
                },
                s3_key=f"traces/{trace_id}.json",
            )
        )
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                name="Pack Preference Campaign",
                mutation_set=[{"mutation_id": "baseline"}],
                eval_set={"checks": ["status"], "trace_ids": [str(trace_id)]},
            )
        )
        db.add(
            QualityContract(
                contract_id=uuid4(),
                project_id=project_id,
                campaign_id=campaign_id,
                required_pack_ids=[str(uuid4())],
                required_tools=["orders.lookup"],
                min_attempts_per_pack=1,
                version=1,
            )
        )
        db.commit()

    response = client.post(
        "/v1/ci/preflight",
        json={
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["ready"] is True
    assert all(issue["code"] != "contract_wrong_pack" for issue in payload["blockers"])
    assert all(issue["code"] != "contract_wrong_pack" for issue in payload["warnings"])


def test_ci_post_run_rejects_when_below_min_scenarios(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """POST /ci/runs returns 422 when eval_set trace count is below min_scenarios."""
    client, testing_session_local, fake_queue, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)

    with testing_session_local() as db:
        # seed 1 trace but require 3 scenarios
        _, campaign_id = _seed_campaign_with_eval_traces(
            db, project_id=project_id, trace_count=1, min_scenarios=3
        )

    response = client.post(
        "/v1/ci/runs",
        json={
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
        },
    )

    assert response.status_code == 422
    assert "min_scenarios" in response.json()["detail"] or "3 scenario" in response.json()["detail"]
    assert fake_queue.calls == []


def test_ci_post_run_passes_min_scenarios_when_enough_traces(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """POST /ci/runs succeeds when eval_set has at least min_scenarios traces."""
    client, testing_session_local, fake_queue, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)

    with testing_session_local() as db:
        _, campaign_id = _seed_campaign_with_eval_traces(
            db, project_id=project_id, trace_count=3, min_scenarios=3
        )

    response = client.post(
        "/v1/ci/runs",
        json={
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
        },
    )

    assert response.status_code == 201
    assert response.json()["trace_count"] == 3
    assert len(fake_queue.calls) == 3


def test_ci_post_run_requires_trace_id_when_no_eval_set_traces(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When eval_set has no trace_ids, trace_id is required in the request."""
    client, testing_session_local, fake_queue, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)

    with testing_session_local() as db:
        _, campaign_id = _seed_trace_and_campaign(db, project_id=project_id)

    response = client.post(
        "/v1/ci/runs",
        json={
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
            # no trace_id and no eval_set.trace_ids
        },
    )

    assert response.status_code == 422
    assert fake_queue.calls == []


def test_ci_preflight_blocks_missing_confirmation_token_for_irreversible_tool(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, _, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)
    with testing_session_local() as db:
        _, campaign_id = _seed_campaign_with_tool_trace(
            db,
            project_id=project_id,
            tool="payments.refund",
            with_confirmation_token=False,
        )

    response = client.post(
        "/v1/ci/preflight",
        json={
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0, "max_failures": 1},
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["ready"] is False
    assert any(item["code"] == "missing_confirmation_token" for item in payload["blockers"])


def test_ci_preflight_ready_when_confirmation_token_present(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, _, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)
    with testing_session_local() as db:
        _, campaign_id = _seed_campaign_with_tool_trace(
            db,
            project_id=project_id,
            tool="payments.refund",
            with_confirmation_token=True,
        )

    response = client.post(
        "/v1/ci/preflight",
        json={
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0, "max_failures": 1},
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["ready"] is True
    assert payload["blockers"] == []


def test_ci_post_run_rejects_when_preflight_has_blockers(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, fake_queue, project_id = ci_test_context
    monkeypatch.delenv("CI_TOKEN", raising=False)
    with testing_session_local() as db:
        _, campaign_id = _seed_campaign_with_tool_trace(
            db,
            project_id=project_id,
            tool="payments.refund",
            with_confirmation_token=False,
        )

    response = client.post(
        "/v1/ci/runs",
        json={
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0, "max_failures": 1},
        },
    )
    assert response.status_code == 422
    payload = response.json()
    assert isinstance(payload["detail"], dict)
    assert payload["detail"]["message"] == "CI preflight failed"
    assert any(item["code"] == "missing_confirmation_token" for item in payload["detail"]["blockers"])
    assert fake_queue.calls == []


def test_get_ci_batch_returns_aggregated_verdict(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET /ci/batch/{batch_id} aggregates decisions from all runs in the batch."""
    client, testing_session_local, _, project_id = ci_test_context
    monkeypatch.setenv("CI_TOKEN", "secret-token")

    trace_id_a = uuid4()
    trace_id_b = uuid4()
    campaign_id = uuid4()
    batch_id = uuid4()
    run_a_id = uuid4()
    run_b_id = uuid4()

    with testing_session_local() as db:
        for tid in (trace_id_a, trace_id_b):
            db.add(Trace(trace_id=tid, project_id=project_id, source="test", s3_key=f"traces/{tid}.json"))
        db.add(Campaign(campaign_id=campaign_id, project_id=project_id, name="Batch Campaign", mutation_set=[], eval_set={}))
        db.add(Run(
            run_id=run_a_id,
            project_id=project_id,
            trace_id=trace_id_a,
            campaign_id=campaign_id,
            status="completed",
            summary={"ci_thresholds": {"min_pass_rate": 0.5, "max_unsafe": 0}, "ci_batch_id": str(batch_id)},
            created_at=datetime(2026, 2, 26, 12, 0, tzinfo=UTC),
        ))
        db.add(Run(
            run_id=run_b_id,
            project_id=project_id,
            trace_id=trace_id_b,
            campaign_id=campaign_id,
            status="completed",
            summary={"ci_thresholds": {"min_pass_rate": 0.5, "max_unsafe": 0}, "ci_batch_id": str(batch_id)},
            created_at=datetime(2026, 2, 26, 12, 1, tzinfo=UTC),
        ))
        db.add_all([
            ReplayAttempt(attempt_id=uuid4(), project_id=project_id, run_id=run_a_id, mutation_id="m1", result="passed", failure_reason=None, first_failure_event_index=None, first_failure_tool=None, artifacts_s3_key=None),
            ReplayAttempt(attempt_id=uuid4(), project_id=project_id, run_id=run_b_id, mutation_id="m1", result="passed", failure_reason=None, first_failure_event_index=None, first_failure_tool=None, artifacts_s3_key=None),
        ])
        db.commit()

    headers = {"X-Sepurux-Token": "secret-token"}
    response = client.get(f"/v1/ci/batch/{batch_id}", headers=headers)
    assert response.status_code == 200
    payload = response.json()
    assert payload["batch_id"] == str(batch_id)
    assert payload["decision"] == "pass"
    assert payload["trace_count"] == 2
    assert payload["scenario_coverage_pct"] == 100.0
    assert set(UUID(rid) for rid in payload["run_ids"]) == {run_a_id, run_b_id}


def test_get_ci_batch_contract_tool_coverage_uses_normalized_trace_events(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, _, project_id = ci_test_context
    monkeypatch.setenv("CI_TOKEN", "secret-token")

    trace_id = uuid4()
    campaign_id = uuid4()
    batch_id = uuid4()
    run_id = uuid4()
    required_tool = "payments.refund"

    with testing_session_local() as db:
        db.add(
            Trace(
                trace_id=trace_id,
                project_id=project_id,
                source="test",
                normalized_payload={
                    "events": [
                        {"type": "tool_call", "tool": required_tool, "args": {"amount": 10}},
                        {"type": "tool_result", "tool": required_tool, "output": {"ok": True}},
                    ]
                },
                s3_key=f"traces/{trace_id}.json",
            )
        )
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                name="Contract Coverage Campaign",
                mutation_set=[],
                eval_set={},
            )
        )
        db.add(
            Run(
                run_id=run_id,
                project_id=project_id,
                trace_id=trace_id,
                campaign_id=campaign_id,
                status="completed",
                summary={
                    "ci_thresholds": {"min_pass_rate": 0.5, "max_unsafe": 0},
                    "ci_batch_id": str(batch_id),
                },
            )
        )
        db.add(
            ReplayAttempt(
                attempt_id=uuid4(),
                project_id=project_id,
                run_id=run_id,
                mutation_id="baseline",
                result="passed",
                failure_reason=None,
                first_failure_event_index=None,
                first_failure_tool=None,
                artifacts_s3_key=None,
            )
        )
        db.add(
            QualityContract(
                contract_id=uuid4(),
                project_id=project_id,
                campaign_id=campaign_id,
                required_pack_ids=[],
                required_tools=[required_tool],
                min_attempts_per_pack=1,
                version=1,
            )
        )
        db.commit()

    headers = {"X-Sepurux-Token": "secret-token"}
    response = client.get(f"/v1/ci/batch/{batch_id}", headers=headers)
    assert response.status_code == 200
    payload = response.json()
    assert payload["contract_report"] is not None
    assert payload["contract_report"]["passed"] is True
    assert required_tool in payload["contract_report"]["covered_tools"]


def test_get_ci_batch_contract_pack_preference_mismatch_fails_contract(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, _, project_id = ci_test_context
    monkeypatch.setenv("CI_TOKEN", "secret-token")

    trace_id = uuid4()
    campaign_id = uuid4()
    batch_id = uuid4()
    run_id = uuid4()
    required_tool = "payments.refund"

    with testing_session_local() as db:
        db.add(
            Trace(
                trace_id=trace_id,
                project_id=project_id,
                source="test",
                normalized_payload={
                    "events": [
                        {"type": "tool_call", "tool": required_tool, "args": {"amount": 10}},
                        {"type": "tool_result", "tool": required_tool, "output": {"ok": True}},
                    ]
                },
                s3_key=f"traces/{trace_id}.json",
            )
        )
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                name="Contract Pack Preference Campaign",
                mutation_set=[],
                eval_set={},
            )
        )
        db.add(
            Run(
                run_id=run_id,
                project_id=project_id,
                trace_id=trace_id,
                campaign_id=campaign_id,
                status="completed",
                mutation_pack_id=None,
                summary={
                    "ci_thresholds": {"min_pass_rate": 0.5, "max_unsafe": 0},
                    "ci_batch_id": str(batch_id),
                },
            )
        )
        db.add(
            ReplayAttempt(
                attempt_id=uuid4(),
                project_id=project_id,
                run_id=run_id,
                mutation_id="baseline",
                result="passed",
                failure_reason=None,
                first_failure_event_index=None,
                first_failure_tool=None,
                artifacts_s3_key=None,
            )
        )
        db.add(
            QualityContract(
                contract_id=uuid4(),
                project_id=project_id,
                campaign_id=campaign_id,
                required_pack_ids=[str(uuid4())],
                required_tools=[required_tool],
                min_attempts_per_pack=1,
                version=1,
            )
        )
        db.commit()

    headers = {"X-Sepurux-Token": "secret-token"}
    response = client.get(f"/v1/ci/batch/{batch_id}", headers=headers)
    assert response.status_code == 200
    payload = response.json()
    assert payload["contract_report"] is not None
    assert payload["contract_report"]["passed"] is False
    assert payload["decision"] == "fail"
    assert payload["contract_report"]["violations"][0]["type"] == "wrong_pack"


def test_get_ci_batch_fails_when_any_run_fails(
    ci_test_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET /ci/batch/{batch_id} returns fail if any run in the batch fails."""
    client, testing_session_local, _, project_id = ci_test_context
    monkeypatch.setenv("CI_TOKEN", "secret-token")

    trace_id_a = uuid4()
    trace_id_b = uuid4()
    campaign_id = uuid4()
    batch_id = uuid4()
    run_a_id = uuid4()
    run_b_id = uuid4()

    with testing_session_local() as db:
        for tid in (trace_id_a, trace_id_b):
            db.add(Trace(trace_id=tid, project_id=project_id, source="test", s3_key=f"traces/{tid}.json"))
        db.add(Campaign(campaign_id=campaign_id, project_id=project_id, name="Batch Fail Campaign", mutation_set=[], eval_set={}))
        db.add(Run(
            run_id=run_a_id,
            project_id=project_id,
            trace_id=trace_id_a,
            campaign_id=campaign_id,
            status="failed",
            summary={"ci_thresholds": {"min_pass_rate": 0.9, "max_unsafe": 0}, "ci_batch_id": str(batch_id)},
            created_at=datetime(2026, 2, 26, 12, 0, tzinfo=UTC),
        ))
        db.add(Run(
            run_id=run_b_id,
            project_id=project_id,
            trace_id=trace_id_b,
            campaign_id=campaign_id,
            status="completed",
            summary={"ci_thresholds": {"min_pass_rate": 0.5, "max_unsafe": 0}, "ci_batch_id": str(batch_id)},
            created_at=datetime(2026, 2, 26, 12, 1, tzinfo=UTC),
        ))
        db.add(ReplayAttempt(attempt_id=uuid4(), project_id=project_id, run_id=run_b_id, mutation_id="m1", result="passed", failure_reason=None, first_failure_event_index=None, first_failure_tool=None, artifacts_s3_key=None))
        db.commit()

    headers = {"X-Sepurux-Token": "secret-token"}
    response = client.get(f"/v1/ci/batch/{batch_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["decision"] == "fail"
    assert response.json()["trace_count"] == 2
