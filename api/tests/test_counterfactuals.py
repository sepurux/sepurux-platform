from __future__ import annotations

from collections.abc import Generator
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import Base, Campaign, Counterfactual, ReplayAttempt, Run, Trace
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import auth_headers, seed_tenant_project_and_key


@pytest.fixture()
def counterfactuals_test_context() -> (
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


def _seed_attempt_with_counterfactuals(db: Session, *, project_id) -> tuple[str, str]:
    trace_id = uuid4()
    campaign_id = uuid4()
    run_id = uuid4()
    attempt_id = uuid4()
    cf_retry_id = uuid4()
    cf_policy_id = uuid4()

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
            campaign_id=campaign_id, project_id=project_id, name="CF", mutation_set=[], eval_set={}
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
        ReplayAttempt(
            attempt_id=attempt_id,
            project_id=project_id,
            run_id=run_id,
            mutation_id="schema_drift.rename_field",
            result="failed",
            failure_reason="schema_drift",
            first_failure_event_index=3,
            first_failure_tool="jira.create_issue",
            artifacts_s3_key=f"runs/{run_id}/attempts/{attempt_id}.timeline.json",
            created_at=datetime(2026, 2, 25, 13, 0, tzinfo=UTC),
        )
    )
    db.add(
        Counterfactual(
            counterfactual_id=cf_retry_id,
            project_id=project_id,
            attempt_id=attempt_id,
            strategy="retry_cap_v1",
            result="fail",
            failure_reason="timeout",
            metrics={"duration_ms": 42, "retries": 1},
            diff={"kind": "retry_policy", "max_retries": 2},
            created_at=datetime(2026, 2, 25, 13, 1, tzinfo=UTC),
        )
    )
    db.add(
        Counterfactual(
            counterfactual_id=cf_policy_id,
            project_id=project_id,
            attempt_id=attempt_id,
            strategy="policy_gate_v1",
            result="fail",
            failure_reason="policy_blocked",
            metrics={"duration_ms": 17, "retries": 0},
            diff={"kind": "policy_gate", "requires_confirmation_token": True},
            created_at=datetime(2026, 2, 25, 13, 2, tzinfo=UTC),
        )
    )
    db.commit()
    return str(attempt_id), str(cf_policy_id)


def test_list_counterfactuals_for_attempt_returns_strategy_results(
    counterfactuals_test_context: tuple[TestClient, sessionmaker[Session], object],
) -> None:
    client, testing_session_local, project_id = counterfactuals_test_context
    with testing_session_local() as db:
        attempt_id, _ = _seed_attempt_with_counterfactuals(db, project_id=project_id)

    response = client.get(f"/v1/attempts/{attempt_id}/counterfactuals")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["strategy"] == "retry_cap_v1"
    assert data[0]["result"] == "fail"
    assert data[0]["metrics"]["retries"] == 1
    assert data[1]["strategy"] == "policy_gate_v1"
    assert data[1]["failure_reason"] == "policy_blocked"
    assert data[1]["diff"]["kind"] == "policy_gate"


def test_get_counterfactual_detail_returns_metadata(
    counterfactuals_test_context: tuple[TestClient, sessionmaker[Session], object],
) -> None:
    client, testing_session_local, project_id = counterfactuals_test_context
    with testing_session_local() as db:
        attempt_id, counterfactual_id = _seed_attempt_with_counterfactuals(
            db, project_id=project_id
        )

    response = client.get(f"/v1/counterfactuals/{counterfactual_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["counterfactual_id"] == counterfactual_id
    assert data["attempt_id"] == attempt_id
    assert data["strategy"] == "policy_gate_v1"
    assert data["metrics"]["duration_ms"] == 17
