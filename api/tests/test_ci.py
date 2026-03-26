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
    Project,
    ReplayAttempt,
    Run,
    TenantControl,
    Trace,
    User,
)
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
        assert row.summary == {
            "ci_thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0, "max_failures": 2}
        }


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
        assert row.summary == {
            "ci_thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
            "github_context": {"repo": "sepurux/sepurux-platform", "pull_request_number": 97},
        }


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
        assert row.summary == {
            "ci_thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
            "github_context": {"repo": "sepurux/sepurux-platform", "pull_request_number": 123},
        }


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
