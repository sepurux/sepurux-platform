from __future__ import annotations

from collections.abc import Generator
from uuid import UUID, uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import Base, Campaign, Failure, Run, Trace
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import auth_headers, seed_tenant_project_and_key


@pytest.fixture()
def failure_test_context() -> Generator[tuple[TestClient, sessionmaker[Session], UUID], None, None]:
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


def test_get_campaign_failures_returns_structured_records(
    failure_test_context: tuple[TestClient, sessionmaker[Session], UUID],
) -> None:
    client, testing_session_local, project_id = failure_test_context
    trace_id = uuid4()
    campaign_id = uuid4()
    run_id = uuid4()

    with testing_session_local() as db:
        db.add(Trace(trace_id=trace_id, project_id=project_id, source="test", s3_key="trace.json"))
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                name="Failure Campaign",
                mutation_set=[{"tool": "jira.create_issue"}],
                eval_set={"checks": ["status"]},
            )
        )
        db.add(
            Run(
                run_id=run_id,
                project_id=project_id,
                trace_id=trace_id,
                campaign_id=campaign_id,
                status="completed",
                summary={},
            )
        )
        db.add(
            Failure(
                failure_id=uuid4(),
                project_id=project_id,
                run_id=run_id,
                campaign_id=campaign_id,
                trace_id=trace_id,
                mutation_name="prompt.injection",
                failure_type="prompt_injection",
                severity="critical",
                description="Prompt injection content reached the tool path.",
                failure_metadata={"tool": "jira.create_issue"},
            )
        )
        db.commit()

    response = client.get(f"/v1/campaigns/{campaign_id}/failures?run_id={run_id}")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["run_id"] == str(run_id)
    assert payload[0]["campaign_id"] == str(campaign_id)
    assert payload[0]["mutation"] == "prompt.injection"
    assert payload[0]["type"] == "prompt_injection"
    assert payload[0]["severity"] == "critical"
    assert payload[0]["metadata"] == {"tool": "jira.create_issue"}


def test_get_campaign_reliability_aggregates_failures_and_supports_run_filter(
    failure_test_context: tuple[TestClient, sessionmaker[Session], UUID],
) -> None:
    client, testing_session_local, project_id = failure_test_context
    trace_id = uuid4()
    campaign_id = uuid4()
    first_run_id = uuid4()
    second_run_id = uuid4()

    with testing_session_local() as db:
        db.add(Trace(trace_id=trace_id, project_id=project_id, source="test", s3_key="trace.json"))
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                name="Reliability Campaign",
                mutation_set=[{"tool": "jira.create_issue"}],
                eval_set={"checks": ["status"]},
            )
        )
        db.add_all(
            [
                Run(
                    run_id=first_run_id,
                    project_id=project_id,
                    trace_id=trace_id,
                    campaign_id=campaign_id,
                    status="completed",
                    summary={},
                ),
                Run(
                    run_id=second_run_id,
                    project_id=project_id,
                    trace_id=trace_id,
                    campaign_id=campaign_id,
                    status="completed",
                    summary={},
                ),
            ]
        )
        db.add_all(
            [
                Failure(
                    failure_id=uuid4(),
                    project_id=project_id,
                    run_id=first_run_id,
                    campaign_id=campaign_id,
                    trace_id=trace_id,
                    mutation_name="prompt.injection",
                    failure_type="prompt_injection",
                    severity="critical",
                    description="critical failure",
                    failure_metadata=None,
                ),
                Failure(
                    failure_id=uuid4(),
                    project_id=project_id,
                    run_id=first_run_id,
                    campaign_id=campaign_id,
                    trace_id=trace_id,
                    mutation_name="core.reliability",
                    failure_type="tool_timeout",
                    severity="high",
                    description="high failure",
                    failure_metadata=None,
                ),
                Failure(
                    failure_id=uuid4(),
                    project_id=project_id,
                    run_id=second_run_id,
                    campaign_id=campaign_id,
                    trace_id=trace_id,
                    mutation_name="core.latency",
                    failure_type="latency_exceeded",
                    severity="medium",
                    description="medium failure",
                    failure_metadata=None,
                ),
            ]
        )
        db.commit()

    response = client.get(f"/v1/campaigns/{campaign_id}/reliability")

    assert response.status_code == 200
    payload = response.json()
    assert payload["reliability_score"] == 83.0
    assert payload["status"] == "warning"
    assert payload["classified_failures"] == 3
    assert payload["failure_breakdown"] == [
        {"type": "latency_exceeded", "count": 1},
        {"type": "prompt_injection", "count": 1},
        {"type": "tool_timeout", "count": 1},
    ]

    filtered_response = client.get(
        f"/v1/campaigns/{campaign_id}/reliability?run_id={first_run_id}"
    )

    assert filtered_response.status_code == 200
    filtered_payload = filtered_response.json()
    assert filtered_payload["reliability_score"] == 85.0
    assert filtered_payload["status"] == "warning"
    assert filtered_payload["classified_failures"] == 2
