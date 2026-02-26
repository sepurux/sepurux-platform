from __future__ import annotations

from collections.abc import Generator
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import Base, Campaign, ReplayAttempt, Run, Trace
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import auth_headers, seed_tenant_project_and_key


@pytest.fixture()
def analytics_test_context() -> (
    Generator[tuple[TestClient, sessionmaker[Session], object], None, None]
):
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
        yield client, testing_session_local, project_id

    app.dependency_overrides.clear()
    if hasattr(app.state, "auth_session_factory"):
        delattr(app.state, "auth_session_factory")
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def _seed_analytics_data(db: Session, *, project_id) -> tuple[str, str]:
    now = datetime.now(UTC)

    trace_id = uuid4()
    campaign_id = uuid4()
    run_stats_id = uuid4()
    run_other_id = uuid4()

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
            name="Analytics Campaign",
            mutation_set=[],
            eval_set={},
        )
    )
    db.add(
        Run(
            run_id=run_stats_id,
            project_id=project_id,
            trace_id=trace_id,
            campaign_id=campaign_id,
            status="completed",
            summary={"attempt_count": 4},
            created_at=now - timedelta(hours=2),
        )
    )
    db.add(
        Run(
            run_id=run_other_id,
            project_id=project_id,
            trace_id=trace_id,
            campaign_id=campaign_id,
            status="completed",
            summary={"attempt_count": 3},
            created_at=now - timedelta(hours=1),
        )
    )

    attempts = [
        ReplayAttempt(
            attempt_id=uuid4(),
            project_id=project_id,
            run_id=run_stats_id,
            mutation_id="m-ok",
            result="passed",
            failure_reason=None,
            first_failure_event_index=None,
            first_failure_tool=None,
            tools_touched=["jira.create_issue", "slack.send_message"],
            tool_call_counts={"jira.create_issue": 1, "slack.send_message": 1},
            created_at=now - timedelta(hours=2, minutes=10),
        ),
        ReplayAttempt(
            attempt_id=uuid4(),
            project_id=project_id,
            run_id=run_stats_id,
            mutation_id="m-timeout",
            result="failed",
            failure_reason="timeout",
            first_failure_event_index=6,
            first_failure_tool="jira.create_issue",
            tools_touched=["jira.create_issue"],
            tool_call_counts={"jira.create_issue": 1},
            created_at=now - timedelta(hours=2, minutes=9),
        ),
        ReplayAttempt(
            attempt_id=uuid4(),
            project_id=project_id,
            run_id=run_stats_id,
            mutation_id="m-permission",
            result="failed",
            failure_reason="permission_denied",
            first_failure_event_index=2,
            first_failure_tool="jira.create_issue",
            tools_touched=["jira.create_issue", "slack.send_message"],
            tool_call_counts={"jira.create_issue": 1, "slack.send_message": 2},
            created_at=now - timedelta(hours=2, minutes=8),
        ),
        ReplayAttempt(
            attempt_id=uuid4(),
            project_id=project_id,
            run_id=run_stats_id,
            mutation_id="m-slack",
            result="failed",
            failure_reason="timeout",
            first_failure_event_index=6,
            first_failure_tool="slack.send_message",
            tools_touched=["slack.send_message"],
            tool_call_counts={"slack.send_message": 1},
            created_at=now - timedelta(hours=2, minutes=7),
        ),
        ReplayAttempt(
            attempt_id=uuid4(),
            project_id=project_id,
            run_id=run_other_id,
            mutation_id="m-jira-extra",
            result="failed",
            failure_reason="timeout",
            first_failure_event_index=3,
            first_failure_tool="jira.create_issue",
            tools_touched=["github.create_pr", "jira.create_issue"],
            tool_call_counts={"github.create_pr": 1, "jira.create_issue": 1},
            created_at=now - timedelta(days=1),
        ),
        ReplayAttempt(
            attempt_id=uuid4(),
            project_id=project_id,
            run_id=run_other_id,
            mutation_id="m-gh",
            result="failed",
            failure_reason="rate_limited",
            first_failure_event_index=4,
            first_failure_tool="github.create_pr",
            tools_touched=["github.create_pr"],
            tool_call_counts={"github.create_pr": 2},
            created_at=now - timedelta(days=2),
        ),
        ReplayAttempt(
            attempt_id=uuid4(),
            project_id=project_id,
            run_id=run_other_id,
            mutation_id="m-old",
            result="failed",
            failure_reason="timeout",
            first_failure_event_index=1,
            first_failure_tool="legacy.tool",
            tools_touched=["legacy.tool"],
            tool_call_counts={"legacy.tool": 1},
            created_at=now - timedelta(days=14),
        ),
    ]

    db.add_all(attempts)
    db.commit()
    return str(run_stats_id), str(run_other_id)


def test_get_run_stats_returns_correct_breakdowns(
    analytics_test_context: tuple[TestClient, sessionmaker[Session], object],
) -> None:
    client, testing_session_local, project_id = analytics_test_context
    with testing_session_local() as db:
        run_stats_id, _ = _seed_analytics_data(db, project_id=project_id)

    response = client.get(f"/v1/runs/{run_stats_id}/stats")

    assert response.status_code == 200
    data = response.json()
    assert data["run_id"] == run_stats_id
    assert data["attempts"] == {
        "total": 4,
        "passed": 1,
        "failed": 3,
        "pass_rate": 0.25,
    }

    assert data["failures_by_tool"][0] == {"tool": "jira.create_issue", "count": 2, "pct": 0.6667}
    assert data["failures_by_tool"][1] == {"tool": "slack.send_message", "count": 1, "pct": 0.3333}
    assert data["tools_usage"] == [
        {"tool": "slack.send_message", "attempts": 3, "calls": 4},
        {"tool": "jira.create_issue", "attempts": 3, "calls": 3},
    ]

    assert data["top_failure_reasons"][0] == {"reason": "timeout", "count": 2, "pct": 0.6667}
    assert data["top_failure_reasons"][1] == {
        "reason": "permission_denied",
        "count": 1,
        "pct": 0.3333,
    }

    assert data["first_failure_step_distribution"] == [
        {"event_index": 2, "count": 1},
        {"event_index": 6, "count": 2},
    ]


def test_get_tools_fragility_orders_by_failures_and_respects_window(
    analytics_test_context: tuple[TestClient, sessionmaker[Session], object],
) -> None:
    client, testing_session_local, project_id = analytics_test_context
    with testing_session_local() as db:
        _seed_analytics_data(db, project_id=project_id)

    response = client.get("/v1/tools/fragility", params={"window_days": 7, "limit": 10})

    assert response.status_code == 200
    data = response.json()
    assert data["window_days"] == 7
    assert data["attempts_definition"] == "tools_touched_denominator_first_failure_numerator"
    assert "generated_at" in data

    tools = data["tools"]
    assert [tool["tool"] for tool in tools] == [
        "jira.create_issue",
        "github.create_pr",
        "slack.send_message",
    ]

    jira = tools[0]
    assert jira["attempts"] == 4
    assert jira["failures"] == 3
    assert jira["failure_rate"] == 0.75
    assert jira["top_reasons"][0] == {"reason": "timeout", "count": 2}
    assert jira["top_reasons"][1] == {"reason": "permission_denied", "count": 1}
    assert {"mutation_id": "m-jira-extra", "count": 1} in jira["top_mutations"]

    github = tools[1]
    assert github["attempts"] == 2
    assert github["failures"] == 1
    assert github["failure_rate"] == 0.5

    slack = tools[2]
    assert slack["attempts"] == 3
    assert slack["failures"] == 1
    assert slack["failure_rate"] == 0.3333
    assert all(tool["tool"] != "legacy.tool" for tool in tools)
