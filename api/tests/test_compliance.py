from __future__ import annotations

from collections.abc import Generator
from uuid import UUID, uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import (
    AuditEvent,
    Base,
    Campaign,
    PolicyEvent,
    Project,
    ReplayAttempt,
    Run,
    SecurityEvent,
    Tenant,
    Trace,
)
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import auth_headers, seed_project_membership_api_key


@pytest.fixture()
def compliance_test_context() -> Generator[
    tuple[TestClient, sessionmaker[Session], UUID, UUID, UUID, str],
    None,
    None,
]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    with testing_session_local() as db:
        tenant_id, project_id, user_id, _api_key_id, api_key_plaintext = (
            seed_project_membership_api_key(
                db,
                role_name="admin",
                pricing_tier="enterprise",
                tenant_name="Compliance Tenant",
                project_name="Compliance Project",
            )
        )

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
        yield client, testing_session_local, tenant_id, project_id, user_id, api_key_plaintext

    app.dependency_overrides.clear()
    if hasattr(app.state, "auth_session_factory"):
        delattr(app.state, "auth_session_factory")
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_compliance_summary_counts_and_scopes_to_project(
    compliance_test_context: tuple[TestClient, sessionmaker[Session], UUID, UUID, UUID, str],
) -> None:
    client, testing_session_local, tenant_id, project_id, user_id, _api_key = (
        compliance_test_context
    )
    sibling_project_id = uuid4()

    trace_id = uuid4()
    campaign_id = uuid4()
    run_id = uuid4()
    attempt_id = uuid4()

    sibling_trace_id = uuid4()
    sibling_campaign_id = uuid4()
    sibling_run_id = uuid4()
    sibling_attempt_id = uuid4()

    with testing_session_local() as db:
        db.add(
            Project(
                project_id=sibling_project_id, tenant_id=tenant_id, owner_id=user_id, name="Sibling"
            )
        )

        db.add(
            Trace(
                trace_id=trace_id,
                project_id=project_id,
                source="seed",
                s3_key=f"traces/{trace_id}.json",
            )
        )
        db.add(
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                name="Primary Campaign",
                mutation_set=[{"mutation_id": "baseline"}],
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
                summary={"pass_rate": 0.8},
            )
        )
        db.add(
            ReplayAttempt(
                attempt_id=attempt_id,
                project_id=project_id,
                run_id=run_id,
                mutation_id="timeout",
                result="failed",
                failure_reason="db.timeout",
            )
        )

        db.add(
            Trace(
                trace_id=sibling_trace_id,
                project_id=sibling_project_id,
                source="seed",
                s3_key=f"traces/{sibling_trace_id}.json",
            )
        )
        db.add(
            Campaign(
                campaign_id=sibling_campaign_id,
                project_id=sibling_project_id,
                name="Sibling Campaign",
                mutation_set=[{"mutation_id": "baseline"}],
                eval_set={"checks": ["status"]},
            )
        )
        db.add(
            Run(
                run_id=sibling_run_id,
                project_id=sibling_project_id,
                trace_id=sibling_trace_id,
                campaign_id=sibling_campaign_id,
                status="completed",
                summary={"pass_rate": 0.9},
            )
        )
        db.add(
            ReplayAttempt(
                attempt_id=sibling_attempt_id,
                project_id=sibling_project_id,
                run_id=sibling_run_id,
                mutation_id="auth.error",
                result="failed",
                failure_reason="unauthorized",
            )
        )

        db.add_all(
            [
                AuditEvent(
                    audit_event_id=uuid4(),
                    project_id=project_id,
                    event_type="run.created",
                    actor="admin",
                    event_metadata={"run_id": str(run_id)},
                ),
                AuditEvent(
                    audit_event_id=uuid4(),
                    project_id=project_id,
                    event_type="policy.pack.updated",
                    actor="admin",
                    event_metadata={"pack": "default"},
                ),
                AuditEvent(
                    audit_event_id=uuid4(),
                    project_id=sibling_project_id,
                    event_type="run.created",
                    actor="admin",
                    event_metadata={"run_id": str(sibling_run_id)},
                ),
                PolicyEvent(
                    policy_event_id=uuid4(),
                    run_id=run_id,
                    attempt_id=attempt_id,
                    event_index=1,
                    tool="payments.refund",
                    action="check",
                    decision="deny",
                    reason="unsafe_refund",
                    input={"amount": 2000},
                ),
                PolicyEvent(
                    policy_event_id=uuid4(),
                    run_id=run_id,
                    attempt_id=attempt_id,
                    event_index=2,
                    tool="payments.refund",
                    action="check",
                    decision="allow",
                    reason=None,
                    input={"amount": 20},
                ),
                PolicyEvent(
                    policy_event_id=uuid4(),
                    run_id=run_id,
                    attempt_id=attempt_id,
                    event_index=3,
                    tool="db.query",
                    action="check",
                    decision="deny",
                    reason="missing_where",
                    input={"sql": "SELECT * FROM users"},
                ),
                PolicyEvent(
                    policy_event_id=uuid4(),
                    run_id=sibling_run_id,
                    attempt_id=sibling_attempt_id,
                    event_index=1,
                    tool="payments.refund",
                    action="check",
                    decision="deny",
                    reason="sibling_project",
                    input={},
                ),
                SecurityEvent(
                    security_event_id=uuid4(),
                    run_id=run_id,
                    attempt_id=attempt_id,
                    event_index=4,
                    tool="web.fetch",
                    zone="untrusted",
                    risk_score=0.9,
                    action="block",
                    matches={"rule": "prompt.injection"},
                ),
                SecurityEvent(
                    security_event_id=uuid4(),
                    run_id=run_id,
                    attempt_id=attempt_id,
                    event_index=5,
                    tool="web.fetch",
                    zone="untrusted",
                    risk_score=0.6,
                    action="sanitize",
                    matches={"rule": "pii"},
                ),
                SecurityEvent(
                    security_event_id=uuid4(),
                    run_id=run_id,
                    attempt_id=attempt_id,
                    event_index=6,
                    tool="payments.refund",
                    zone="trusted",
                    risk_score=0.2,
                    action="allow",
                    matches=None,
                ),
                SecurityEvent(
                    security_event_id=uuid4(),
                    run_id=sibling_run_id,
                    attempt_id=sibling_attempt_id,
                    event_index=2,
                    tool="web.fetch",
                    zone="untrusted",
                    risk_score=0.8,
                    action="block",
                    matches={"rule": "sibling_project"},
                ),
            ]
        )
        db.commit()

    response = client.get("/v1/compliance/summary?window_days=30&top_n=2")
    assert response.status_code == 200
    payload = response.json()

    assert payload["window_days"] == 30
    assert payload["audit_events_total"] == 2
    assert payload["policy_events_total"] == 3
    assert payload["security_events_total"] == 3
    assert payload["policy_denies"] == 2
    assert payload["security_blocks"] == 1
    assert payload["security_sanitizations"] == 1
    assert payload["top_policy_tools"] == [
        {"tool": "payments.refund", "count": 2},
        {"tool": "db.query", "count": 1},
    ]
    assert payload["top_security_tools"] == [
        {"tool": "web.fetch", "count": 2},
        {"tool": "payments.refund", "count": 1},
    ]
    assert isinstance(payload.get("generated_at"), str)


def test_compliance_summary_requires_audit_section_access(
    compliance_test_context: tuple[TestClient, sessionmaker[Session], UUID, UUID, UUID, str],
) -> None:
    client, testing_session_local, tenant_id, _project_id, _user_id, _api_key = (
        compliance_test_context
    )

    with testing_session_local() as db:
        tenant = db.scalar(select(Tenant).where(Tenant.tenant_id == tenant_id))
        assert isinstance(tenant, Tenant)
        tenant.pricing_tier = "starter"
        db.add(tenant)
        db.commit()

    response = client.get("/v1/compliance/summary")
    assert response.status_code == 403
    payload = response.json()
    assert "audit access is not available" in payload["detail"]
