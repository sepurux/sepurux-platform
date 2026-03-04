from __future__ import annotations

from collections.abc import Generator
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import (
    Base,
    Campaign,
    Project,
    ReplayAttempt,
    Run,
    SecurityEvent,
    ToolRegistry,
    Trace,
)
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import auth_headers, seed_tenant_project_and_key


@pytest.fixture()
def security_test_context() -> Generator[tuple[TestClient, sessionmaker[Session], UUID], None, None]:
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


def test_tools_registry_crud_is_project_scoped(
    security_test_context: tuple[TestClient, sessionmaker[Session], UUID],
) -> None:
    client, testing_session_local, project_id = security_test_context

    create_response = client.post(
        "/v1/tools",
        json={"name": "jira.create_issue", "zone": "untrusted"},
    )
    assert create_response.status_code == 201
    payload = create_response.json()
    tool_id = payload["tool_id"]
    assert payload["project_id"] == str(project_id)
    assert payload["zone"] == "untrusted"

    patch_response = client.patch(f"/v1/tools/{tool_id}", json={"zone": "trusted"})
    assert patch_response.status_code == 200
    assert patch_response.json()["zone"] == "trusted"

    other_project_id = uuid4()
    other_tool_id = uuid4()
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
            ToolRegistry(
                tool_id=other_tool_id,
                project_id=other_project_id,
                name="payments.refund",
                zone="untrusted",
            )
        )
        db.commit()

    list_response = client.get("/v1/tools")
    assert list_response.status_code == 200
    listed_ids = {item["tool_id"] for item in list_response.json()}
    assert tool_id in listed_ids
    assert str(other_tool_id) not in listed_ids


def test_run_security_events_endpoint_and_stats_counts(
    security_test_context: tuple[TestClient, sessionmaker[Session], UUID],
) -> None:
    client, testing_session_local, project_id = security_test_context

    trace_id = uuid4()
    campaign_id = uuid4()
    run_id = uuid4()
    attempt_id = uuid4()

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
                name="Security Campaign",
                mutation_set=[{"mutation_id": "m-1", "tool": "jira.create_issue"}],
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
                summary={"injection_blocks": 0, "injection_sanitizations": 0},
            )
        )
        db.add(
            ReplayAttempt(
                attempt_id=attempt_id,
                project_id=project_id,
                run_id=run_id,
                mutation_id="m-1",
                result="failed",
                failure_reason="prompt_injection_blocked",
                first_failure_event_index=3,
                first_failure_tool="jira.create_issue",
                artifacts_s3_key=None,
            )
        )
        db.add_all(
            [
                SecurityEvent(
                    security_event_id=uuid4(),
                    run_id=run_id,
                    attempt_id=attempt_id,
                    event_index=3,
                    tool="jira.create_issue",
                    zone="untrusted",
                    risk_score=0.92,
                    action="block",
                    matches=["ignore_previous_instructions"],
                    created_at=datetime.now(UTC),
                ),
                SecurityEvent(
                    security_event_id=uuid4(),
                    run_id=run_id,
                    attempt_id=attempt_id,
                    event_index=4,
                    tool="slack.send_message",
                    zone="untrusted",
                    risk_score=0.52,
                    action="sanitize",
                    matches=["system_prompt_reference"],
                    created_at=datetime.now(UTC),
                ),
            ]
        )
        db.commit()

    events_response = client.get(f"/v1/runs/{run_id}/security-events")
    assert events_response.status_code == 200
    events_payload = events_response.json()
    assert len(events_payload) == 2
    assert {event["action"] for event in events_payload} == {"block", "sanitize"}

    stats_response = client.get(f"/v1/runs/{run_id}/stats")
    assert stats_response.status_code == 200
    stats_payload = stats_response.json()
    assert stats_payload["injection_blocks"] == 1
    assert stats_payload["injection_sanitizations"] == 1
