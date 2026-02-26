from __future__ import annotations

from collections.abc import Generator
from datetime import UTC, datetime
from uuid import UUID, uuid4

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
def attempts_test_context(
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[tuple[TestClient, sessionmaker[Session], str], None, None]:
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


def _seed_run_with_attempts(db: Session, *, project_id: UUID) -> tuple[str, str, str, str]:
    trace_id = uuid4()
    campaign_id = uuid4()
    run_id = uuid4()
    attempt_ok_id = uuid4()
    attempt_fail_id = uuid4()

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
            name="Inspector Campaign",
            mutation_set=[{"mutation_id": "m1"}],
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
            summary={"attempt_count": 2},
        )
    )
    db.add(
        ReplayAttempt(
            attempt_id=attempt_ok_id,
            project_id=project_id,
            run_id=run_id,
            mutation_id="m-ok",
            result="passed",
            failure_reason=None,
            first_failure_event_index=None,
            first_failure_tool=None,
            artifacts_s3_key=f"runs/{run_id}/attempts/{attempt_ok_id}.timeline.json",
            created_at=datetime(2026, 2, 25, 12, 0, tzinfo=UTC),
        )
    )
    db.add(
        ReplayAttempt(
            attempt_id=attempt_fail_id,
            project_id=project_id,
            run_id=run_id,
            mutation_id="m-fail",
            result="failed",
            failure_reason="timeout",
            first_failure_event_index=12,
            first_failure_tool="jira.create_issue",
            artifacts_s3_key=f"runs/{run_id}/attempts/{attempt_fail_id}.timeline.json",
            created_at=datetime(2026, 2, 25, 12, 1, tzinfo=UTC),
        )
    )
    db.commit()
    return str(run_id), str(attempt_ok_id), str(attempt_fail_id), "jira.create_issue"


def test_list_attempts_filters_and_returns_failure_fields(
    attempts_test_context: tuple[TestClient, sessionmaker[Session], UUID],
) -> None:
    client, testing_session_local, project_id = attempts_test_context
    with testing_session_local() as db:
        run_id, _, failed_attempt_id, failed_tool = _seed_run_with_attempts(
            db, project_id=project_id
        )

    response = client.get(
        f"/v1/runs/{run_id}/attempts", params={"result": "failed", "limit": 50, "offset": 0}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    attempt = data[0]
    assert attempt["attempt_id"] == failed_attempt_id
    assert attempt["result"] == "failed"
    assert attempt["failure_reason"] == "timeout"
    assert attempt["first_failure_event_index"] == 12
    assert attempt["first_failure_tool"] == failed_tool


def test_get_attempt_details_returns_artifact_key_and_failure_metadata(
    attempts_test_context: tuple[TestClient, sessionmaker[Session], UUID],
) -> None:
    client, testing_session_local, project_id = attempts_test_context
    with testing_session_local() as db:
        _, _, failed_attempt_id, _ = _seed_run_with_attempts(db, project_id=project_id)

    response = client.get(f"/v1/attempts/{failed_attempt_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["attempt_id"] == failed_attempt_id
    assert data["artifacts_s3_key"].endswith(f"{failed_attempt_id}.timeline.json")
    assert data["first_failure_event_index"] == 12
    assert data["first_failure_tool"] == "jira.create_issue"


def test_get_attempt_timeline_returns_json(
    attempts_test_context: tuple[TestClient, sessionmaker[Session], UUID],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, project_id = attempts_test_context
    with testing_session_local() as db:
        _, _, failed_attempt_id, _ = _seed_run_with_attempts(db, project_id=project_id)

    monkeypatch.setattr(
        "app.services.attempt_service.get_json_object",
        lambda key, max_bytes=1_000_000: {
            "timeline_version": "0.1",
            "attempt_id": failed_attempt_id,
            "events": [{"index": 0, "type": "tool_call", "tool": "jira.create_issue"}],
            "first_failure": {"event_index": 12, "tool": "jira.create_issue", "reason": "timeout"},
        },
    )

    response = client.get(f"/v1/attempts/{failed_attempt_id}/timeline")

    assert response.status_code == 200
    data = response.json()
    assert data["timeline_version"] == "0.1"
    assert data["first_failure"]["tool"] == "jira.create_issue"
