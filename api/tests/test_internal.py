from __future__ import annotations

from collections.abc import Generator
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from app.auth import hash_api_key
from app.db import get_db
from app.main import app
from app.models import (
    ApiKey,
    Base,
    Campaign,
    CreditTransaction,
    CreditWallet,
    Failure,
    Project,
    ProjectMembership,
    Role,
    Run,
    Tenant,
    Trace,
    User,
)
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import auth_headers


@pytest.fixture()
def internal_test_context() -> Generator[tuple[TestClient, sessionmaker[Session]], None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.state.auth_session_factory = testing_session_local

    with TestClient(app) as client:
        yield client, testing_session_local

    app.dependency_overrides.clear()
    if hasattr(app.state, "auth_session_factory"):
        delattr(app.state, "auth_session_factory")
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def _seed_internal_fixture(db: Session) -> dict[str, str]:
    now = datetime.now(UTC)

    tenant_id = uuid4()
    project_id = uuid4()
    super_user_id = uuid4()
    admin_user_id = uuid4()

    role_super_admin_id = uuid4()
    role_admin_id = uuid4()

    trace_id = uuid4()
    campaign_id = uuid4()
    run_id = uuid4()
    failed_run_id = uuid4()

    super_api_key_plaintext = "cl_super_admin_test"
    admin_api_key_plaintext = "cl_admin_test"

    db.add_all(
        [
            Tenant(tenant_id=tenant_id, name="Sepurux Team", pricing_tier="enterprise"),
            Role(role_id=role_super_admin_id, name="super_admin"),
            Role(role_id=role_admin_id, name="admin"),
            User(user_id=super_user_id, email="ops@sepurux.com", name="Alpha Ops"),
            User(user_id=admin_user_id, email="admin@example.com", name="Admin"),
            Project(
                project_id=project_id,
                tenant_id=tenant_id,
                owner_id=super_user_id,
                name="Alpha Internal Control",
            ),
            ProjectMembership(
                user_id=super_user_id,
                project_id=project_id,
                role_id=role_super_admin_id,
            ),
            ProjectMembership(
                user_id=admin_user_id,
                project_id=project_id,
                role_id=role_admin_id,
            ),
            ApiKey(
                api_key_id=uuid4(),
                tenant_id=tenant_id,
                project_id=project_id,
                user_id=super_user_id,
                name="super-admin-key",
                key_hash=hash_api_key(super_api_key_plaintext),
            ),
            ApiKey(
                api_key_id=uuid4(),
                tenant_id=tenant_id,
                project_id=project_id,
                user_id=admin_user_id,
                name="admin-key",
                key_hash=hash_api_key(admin_api_key_plaintext),
            ),
            Trace(
                trace_id=trace_id,
                project_id=project_id,
                source="test",
                s3_key=f"traces/{trace_id}.json",
            ),
            Campaign(
                campaign_id=campaign_id,
                project_id=project_id,
                name="Alpha Internal Campaign",
                mutation_set=[],
                eval_set={},
            ),
            Run(
                run_id=run_id,
                project_id=project_id,
                trace_id=trace_id,
                campaign_id=campaign_id,
                status="running",
                summary={},
                created_at=now,
            ),
            Run(
                run_id=failed_run_id,
                project_id=project_id,
                trace_id=trace_id,
                campaign_id=campaign_id,
                status="failed",
                summary={},
                created_at=now,
            ),
            Failure(
                failure_id=uuid4(),
                project_id=project_id,
                run_id=run_id,
                campaign_id=campaign_id,
                trace_id=trace_id,
                mutation_name="alpha.prompt.injection",
                failure_type="alpha-security",
                severity="high",
                description="alpha injection detected",
                created_at=now,
            ),
            CreditTransaction(
                credit_transaction_id=uuid4(),
                user_id=super_user_id,
                amount=-37,
                type="usage",
                reason="internal-test-run",
                created_at=now,
            ),
            CreditWallet(
                wallet_id=uuid4(),
                user_id=super_user_id,
                balance=200,
                monthly_credits=120,
                topup_credits=80,
                updated_at=now,
            ),
        ]
    )
    db.commit()

    return {
        "project_id": str(project_id),
        "super_api_key": super_api_key_plaintext,
        "admin_api_key": admin_api_key_plaintext,
    }


def test_internal_dashboard_allows_super_admin_role(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["super_api_key"], project_id=fixture["project_id"])
    )
    response = client.get("/v1/internal/dashboard")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_users"] == 2
    assert payload["active_projects"] == 1
    assert payload["running_campaigns"] == 1
    assert payload["failures_last_24h"] == 1
    assert payload["credits_used"] == 37
    assert payload["system_health"]["status"] in {"healthy", "degraded", "unknown"}


def test_internal_dashboard_rejects_non_super_admin(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["admin_api_key"], project_id=fixture["project_id"])
    )
    response = client.get("/v1/internal/dashboard")

    assert response.status_code == 403
    assert response.json() == {"detail": "Super admin access required"}


def test_internal_dashboard_allows_super_admin_email_allowlist(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    monkeypatch.setenv("SUPER_ADMIN_EMAILS", "admin@example.com")

    client.headers.update(
        auth_headers(api_key=fixture["admin_api_key"], project_id=fixture["project_id"])
    )
    response = client.get("/v1/internal/dashboard")

    assert response.status_code == 200


def test_internal_search_returns_cross_entity_results(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["super_api_key"], project_id=fixture["project_id"])
    )
    response = client.get("/v1/internal/search?q=alpha")

    assert response.status_code == 200
    payload = response.json()
    assert payload["query"] == "alpha"
    assert len(payload["users"]) >= 1
    assert len(payload["projects"]) >= 1
    assert len(payload["campaigns"]) >= 1
    assert len(payload["failures"]) >= 1
    assert payload["users"][0]["email"] == "ops@sepurux.com"
    assert payload["projects"][0]["name"] == "Alpha Internal Control"
    assert payload["campaigns"][0]["name"] == "Alpha Internal Campaign"
    assert payload["failures"][0]["failure_type"] == "alpha-security"


def test_internal_search_rejects_non_super_admin(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["admin_api_key"], project_id=fixture["project_id"])
    )
    response = client.get("/v1/internal/search?q=alpha")

    assert response.status_code == 403
    assert response.json() == {"detail": "Super admin access required"}


def test_internal_search_rejects_blank_query(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["super_api_key"], project_id=fixture["project_id"])
    )
    response = client.get("/v1/internal/search?q=%20%20%20")

    assert response.status_code == 400
    assert response.json() == {"detail": "Search query cannot be empty"}


def test_internal_audit_logs_list_admin_actions(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["super_api_key"], project_id=fixture["project_id"])
    )
    assert client.get("/v1/internal/dashboard").status_code == 200
    assert client.get("/v1/internal/search?q=alpha").status_code == 200

    response = client.get("/v1/internal/audit-logs?limit=20")
    assert response.status_code == 200
    payload = response.json()
    actions = {item["action"] for item in payload}
    assert "internal.dashboard.view" in actions
    assert "internal.search" in actions


def test_internal_audit_logs_include_user_project_create_action(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["super_api_key"], project_id=fixture["project_id"])
    )
    create_response = client.post("/v1/projects", json={"name": "Alpha New Project"})
    assert create_response.status_code == 201

    logs_response = client.get("/v1/internal/audit-logs?limit=50&action=project.create")
    assert logs_response.status_code == 200
    payload = logs_response.json()
    assert any(item["action"] == "project.create" for item in payload)


def test_internal_audit_logs_reject_non_super_admin(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["admin_api_key"], project_id=fixture["project_id"])
    )
    response = client.get("/v1/internal/audit-logs")

    assert response.status_code == 403
    assert response.json() == {"detail": "Super admin access required"}


def test_internal_alerts_list_returns_expected_alert_types(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["super_api_key"], project_id=fixture["project_id"])
    )
    response = client.get("/v1/internal/alerts")

    assert response.status_code == 200
    payload = response.json()
    alert_types = {item["alert_type"] for item in payload}
    assert "high_failure_rate" in alert_types
    assert "campaign_failures" in alert_types
    assert "system_errors" in alert_types


def test_internal_alert_notify_returns_channel_results(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["super_api_key"], project_id=fixture["project_id"])
    )
    response = client.post("/v1/internal/alerts/notify")

    assert response.status_code == 200
    payload = response.json()
    assert payload["alerts_count"] >= 1
    channels = {item["channel"] for item in payload["notifications"]}
    assert channels == {"slack", "email"}


def test_internal_alerts_reject_non_super_admin(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["admin_api_key"], project_id=fixture["project_id"])
    )
    response = client.get("/v1/internal/alerts")

    assert response.status_code == 403
    assert response.json() == {"detail": "Super admin access required"}


def test_internal_analytics_returns_summary(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["super_api_key"], project_id=fixture["project_id"])
    )
    response = client.get("/v1/internal/analytics")

    assert response.status_code == 200
    payload = response.json()
    assert payload["active_users"] == 1
    assert payload["credits_used_last_30_days"] == 37
    assert payload["failure_trend"]["failures_last_24h"] == 1
    assert payload["failure_trend"]["direction"] in {"up", "down", "flat"}
    assert len(payload["top_projects"]) >= 1
    assert payload["top_projects"][0]["name"] == "Alpha Internal Control"


def test_internal_analytics_reject_non_super_admin(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["admin_api_key"], project_id=fixture["project_id"])
    )
    response = client.get("/v1/internal/analytics")

    assert response.status_code == 403
    assert response.json() == {"detail": "Super admin access required"}


def test_internal_queues_returns_overview(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["super_api_key"], project_id=fixture["project_id"])
    )
    response = client.get("/v1/internal/queues")

    assert response.status_code == 200
    payload = response.json()
    assert payload["jobs_running"] >= 0
    assert payload["jobs_failed"] >= 0
    assert payload["queue_backlog"] >= 0
    assert payload["worker_status"] in {"online", "offline", "unknown"}


def test_internal_queue_actions_return_result(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["super_api_key"], project_id=fixture["project_id"])
    )

    retry_response = client.post("/v1/internal/queues/retry", json={"job_id": "missing-job"})
    assert retry_response.status_code == 200
    retry_payload = retry_response.json()
    assert retry_payload["action"] == "retry"
    assert retry_payload["job_id"] == "missing-job"
    assert retry_payload["success"] is False

    cancel_response = client.post("/v1/internal/queues/cancel", json={"job_id": "missing-job"})
    assert cancel_response.status_code == 200
    cancel_payload = cancel_response.json()
    assert cancel_payload["action"] == "cancel"
    assert cancel_payload["job_id"] == "missing-job"
    assert cancel_payload["success"] is False


def test_internal_queues_reject_non_super_admin(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["admin_api_key"], project_id=fixture["project_id"])
    )
    response = client.get("/v1/internal/queues")

    assert response.status_code == 403
    assert response.json() == {"detail": "Super admin access required"}


def test_internal_billing_lists_wallets_and_transactions(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["super_api_key"], project_id=fixture["project_id"])
    )

    wallets_response = client.get("/v1/internal/billing/wallets")
    assert wallets_response.status_code == 200
    wallets_payload = wallets_response.json()
    assert len(wallets_payload) >= 1
    assert wallets_payload[0]["email"] == "ops@sepurux.com"

    transactions_response = client.get("/v1/internal/billing/transactions")
    assert transactions_response.status_code == 200
    transactions_payload = transactions_response.json()
    assert len(transactions_payload) >= 1


def test_internal_billing_adjusts_credits(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)
        ops_user = db.scalar(select(User).where(User.email == "ops@sepurux.com"))
        assert isinstance(ops_user, User)
        user_id = str(ops_user.user_id)

    client.headers.update(
        auth_headers(api_key=fixture["super_api_key"], project_id=fixture["project_id"])
    )

    response = client.post(
        "/v1/internal/billing/adjust",
        json={"user_id": user_id, "amount": 50, "reason": "manual top-up"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["wallet"]["balance"] == 250
    assert payload["transaction"]["type"] == "manual_adjustment"


def test_internal_billing_rejects_non_super_admin(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["admin_api_key"], project_id=fixture["project_id"])
    )
    response = client.get("/v1/internal/billing/wallets")

    assert response.status_code == 403
    assert response.json() == {"detail": "Super admin access required"}


def test_internal_system_overview_returns_metrics(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["super_api_key"], project_id=fixture["project_id"])
    )
    response = client.get("/v1/internal/system")

    assert response.status_code == 200
    payload = response.json()
    assert payload["api_latency_ms"] >= 0
    assert payload["worker_status"] in {"online", "offline", "unknown"}
    assert payload["error_rate_24h"] >= 0
    assert payload["uptime_seconds"] >= 0


def test_internal_system_rejects_non_super_admin(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["admin_api_key"], project_id=fixture["project_id"])
    )
    response = client.get("/v1/internal/system")

    assert response.status_code == 403
    assert response.json() == {"detail": "Super admin access required"}


def test_internal_settings_get_and_update(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["super_api_key"], project_id=fixture["project_id"])
    )

    get_response = client.get("/v1/internal/settings")
    assert get_response.status_code == 200
    assert get_response.json() == {
        "enable_ci": True,
        "enable_mutations": True,
        "enable_billing": True,
    }

    update_response = client.put(
        "/v1/internal/settings",
        json={
            "enable_ci": False,
            "enable_mutations": True,
            "enable_billing": False,
        },
    )
    assert update_response.status_code == 200
    assert update_response.json() == {
        "enable_ci": False,
        "enable_mutations": True,
        "enable_billing": False,
    }

    verify_response = client.get("/v1/internal/settings")
    assert verify_response.status_code == 200
    assert verify_response.json() == {
        "enable_ci": False,
        "enable_mutations": True,
        "enable_billing": False,
    }


def test_internal_settings_reject_non_super_admin(
    internal_test_context: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, session_factory = internal_test_context

    with session_factory() as db:
        fixture = _seed_internal_fixture(db)

    client.headers.update(
        auth_headers(api_key=fixture["admin_api_key"], project_id=fixture["project_id"])
    )

    get_response = client.get("/v1/internal/settings")
    assert get_response.status_code == 403
    assert get_response.json() == {"detail": "Super admin access required"}

    update_response = client.put(
        "/v1/internal/settings",
        json={
            "enable_ci": False,
            "enable_mutations": False,
            "enable_billing": False,
        },
    )
    assert update_response.status_code == 403
    assert update_response.json() == {"detail": "Super admin access required"}
