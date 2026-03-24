from __future__ import annotations

from collections.abc import Generator
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import Base, Campaign, Failure, ReplayAttempt, Run, Trace
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
            mutation_trace={
                "seed": 101,
                "applied": [
                    {
                        "mutation_id": "schema.drop_field",
                        "tool": "jira.create_issue",
                        "event_index": 2,
                    },
                    {"mutation_id": "poison.inject", "tool": "jira.create_issue", "event_index": 3},
                ],
            },
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
            mutation_trace={
                "seed": 102,
                "applied": [
                    {
                        "mutation_id": "schema.drop_field",
                        "tool": "jira.create_issue",
                        "event_index": 3,
                    },
                    {"mutation_id": "fault.timeout", "tool": "jira.create_issue", "event_index": 4},
                ],
            },
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
            mutation_trace={
                "seed": 103,
                "applied": [
                    {
                        "mutation_id": "schema.drop_field",
                        "tool": "jira.create_issue",
                        "event_index": 1,
                    },
                    {
                        "mutation_id": "schema.drop_field",
                        "tool": "jira.create_issue",
                        "event_index": 2,
                    },
                    {
                        "mutation_id": "fault.rate_limit",
                        "tool": "slack.send_message",
                        "event_index": 3,
                    },
                ],
            },
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
            mutation_trace={
                "seed": 104,
                "applied": [
                    {
                        "mutation_id": "poison.inject",
                        "tool": "slack.send_message",
                        "event_index": 5,
                    },
                ],
            },
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


def _seed_lethal_mutation_data(db: Session, *, project_id) -> str:
    now = datetime.now(UTC)
    trace_id = uuid4()
    campaign_id = uuid4()
    run_id = uuid4()

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
            name="Lethal Mutation Campaign",
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
            summary={"attempt_count": 12},
            created_at=now - timedelta(minutes=40),
        )
    )

    definitions = [
        (["schema.drop_field", "rare.mutation"], "failed", "timeout", "jira.create_issue"),
        (["schema.drop_field", "rare.mutation"], "passed", None, None),
        (
            ["schema.drop_field", "fault.timeout", "schema.drop_field"],
            "failed",
            "timeout",
            "jira.create_issue",
        ),
        (
            ["schema.drop_field", "fault.timeout"],
            "failed",
            "permission_denied",
            "slack.send_message",
        ),
        (["schema.drop_field", "fault.timeout"], "passed", None, None),
        (["schema.drop_field", "fault.timeout"], "failed", "timeout", "jira.create_issue"),
        (["fault.timeout"], "failed", "rate_limited", "github.create_pr"),
        (["fault.timeout", "poison.inject"], "passed", None, None),
        (["fault.timeout", "poison.inject"], "passed", None, None),
        (["poison.inject", "rare.mutation"], "failed", "timeout", "slack.send_message"),
        (["poison.inject", "rare.mutation"], "failed", "permission_denied", "jira.create_issue"),
        (["poison.inject"], "passed", None, None),
    ]

    attempts: list[ReplayAttempt] = []
    for offset, (applied_ids, result, reason, tool) in enumerate(definitions):
        applied = [
            {"mutation_id": mutation_id, "tool": tool or "unknown", "event_index": 2 + idx}
            for idx, mutation_id in enumerate(applied_ids)
        ]
        attempts.append(
            ReplayAttempt(
                attempt_id=uuid4(),
                project_id=project_id,
                run_id=run_id,
                mutation_id=f"attempt-{offset}",
                result=result,
                failure_reason=reason,
                first_failure_event_index=3 if result == "failed" else None,
                first_failure_tool=tool,
                mutation_trace={
                    "seed": 200 + offset,
                    "applied": applied,
                },
                created_at=now - timedelta(minutes=30 - offset),
            )
        )

    db.add_all(attempts)
    db.commit()
    return str(run_id)


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
    assert data["attribution"] == "mvp_multi_attribution_each_applied_mutation_gets_credit"
    assert isinstance(data["insights"], list)


def test_get_run_stats_includes_most_lethal_mutations_from_mutation_trace(
    analytics_test_context: tuple[TestClient, sessionmaker[Session], object],
) -> None:
    client, testing_session_local, project_id = analytics_test_context
    with testing_session_local() as db:
        run_stats_id, _ = _seed_analytics_data(db, project_id=project_id)

    response = client.get(f"/v1/runs/{run_stats_id}/stats")

    assert response.status_code == 200
    data = response.json()
    lethal = data["most_lethal_mutations"]
    assert lethal == []


def test_get_run_stats_most_lethal_mutations_applies_threshold_and_sorting(
    analytics_test_context: tuple[TestClient, sessionmaker[Session], object],
) -> None:
    client, testing_session_local, project_id = analytics_test_context
    with testing_session_local() as db:
        run_id = _seed_lethal_mutation_data(db, project_id=project_id)

    response = client.get(f"/v1/runs/{run_id}/stats")

    assert response.status_code == 200
    data = response.json()
    lethal = data["most_lethal_mutations"]
    assert len(lethal) == 3
    assert [item["mutation_id"] for item in lethal] == [
        "schema.drop_field",
        "fault.timeout",
        "poison.inject",
    ]

    by_id = {item["mutation_id"]: item for item in lethal}
    assert all(item["attempts_hit"] >= 5 for item in lethal)
    assert "rare.mutation" not in by_id

    assert by_id["schema.drop_field"]["attempts_hit"] == 6
    assert by_id["schema.drop_field"]["failures"] == 4
    assert by_id["schema.drop_field"]["failure_rate_when_hit"] == 0.6667
    assert by_id["schema.drop_field"]["top_tools"][0] == {
        "tool": "jira.create_issue",
        "count": 3,
    }

    assert by_id["fault.timeout"]["attempts_hit"] == 7
    assert by_id["fault.timeout"]["failures"] == 4
    assert by_id["fault.timeout"]["failure_rate_when_hit"] == 0.5714
    assert by_id["fault.timeout"]["top_reasons"][0] == {"reason": "timeout", "count": 2}

    assert by_id["poison.inject"]["attempts_hit"] == 5
    assert by_id["poison.inject"]["failures"] == 2
    assert by_id["poison.inject"]["failure_rate_when_hit"] == 0.4
    assert data["insights"]
    assert all("id" in item and "confidence" in item for item in data["insights"])


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


def test_get_project_reliability_summary_uses_weighted_run_pass_rate(
    analytics_test_context: tuple[TestClient, sessionmaker[Session], object],
) -> None:
    client, testing_session_local, project_id = analytics_test_context
    with testing_session_local() as db:
        now = datetime.now(UTC)
        trace_id = uuid4()
        campaign_id = uuid4()
        run_good_id = uuid4()
        run_bad_id = uuid4()

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
                name="Reliability Campaign",
                mutation_set=[],
                eval_set={},
            )
        )
        db.add(
            Run(
                run_id=run_good_id,
                project_id=project_id,
                trace_id=trace_id,
                campaign_id=campaign_id,
                status="completed",
                summary={"attempt_count": 80, "pass_rate": 0.9},
                created_at=now - timedelta(hours=3),
            )
        )
        db.add(
            Run(
                run_id=run_bad_id,
                project_id=project_id,
                trace_id=trace_id,
                campaign_id=campaign_id,
                status="completed",
                summary={"attempt_count": 20, "pass_rate": 0.5},
                created_at=now - timedelta(hours=2),
            )
        )
        db.add_all(
            [
                Failure(
                    failure_id=uuid4(),
                    project_id=project_id,
                    run_id=run_good_id,
                    campaign_id=campaign_id,
                    trace_id=trace_id,
                    mutation_name="db.timeout",
                    failure_type="db.timeout",
                    severity="high",
                    description="DB timeout",
                    created_at=now - timedelta(hours=2, minutes=30),
                ),
                Failure(
                    failure_id=uuid4(),
                    project_id=project_id,
                    run_id=run_bad_id,
                    campaign_id=campaign_id,
                    trace_id=trace_id,
                    mutation_name="db.timeout",
                    failure_type="db.timeout",
                    severity="critical",
                    description="DB timeout",
                    created_at=now - timedelta(hours=1, minutes=50),
                ),
                Failure(
                    failure_id=uuid4(),
                    project_id=project_id,
                    run_id=run_bad_id,
                    campaign_id=campaign_id,
                    trace_id=trace_id,
                    mutation_name="policy.blocked",
                    failure_type="policy.blocked",
                    severity="medium",
                    description="Policy blocked tool",
                    created_at=now - timedelta(hours=1, minutes=40),
                ),
            ]
        )
        db.commit()

    response = client.get("/v1/analytics/reliability")

    assert response.status_code == 200
    payload = response.json()
    assert payload["campaigns_run"] == 2
    assert payload["reliability_score"] == 82.0
    assert payload["status"] == "warning"
    assert payload["credits_used"] == 0
    assert payload["failure_breakdown"] == [
        {"type": "db.timeout", "count": 2},
        {"type": "policy.blocked", "count": 1},
    ]
