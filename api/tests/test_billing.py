from __future__ import annotations

from collections.abc import Generator
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import Base, Campaign, CreditWallet, Project, Tenant, Trace
from app.services.billing_service import (
    PRO_PLAN_ID,
    ensure_user_billing,
    grant_due_monthly_credits,
)
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import auth_headers, seed_project_membership_api_key


class FakeQueue:
    def __init__(self) -> None:
        self.calls: list[tuple[tuple[object, ...], dict[str, object]]] = []

    def enqueue(self, *args: object, **kwargs: object) -> object:
        self.calls.append((args, kwargs))
        return {"queued": True}


@pytest.fixture()
def billing_test_context(
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[
    tuple[TestClient, sessionmaker[Session], UUID, UUID, str, FakeQueue, FakeQueue],
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
        tenant_id, project_id, user_id, _, api_key_plaintext = seed_project_membership_api_key(
            db,
            role_name="admin",
            pricing_tier="starter",
        )

    normal_queue = FakeQueue()
    priority_queue = FakeQueue()

    def fake_get_run_queue(*, priority: str = "normal") -> FakeQueue:
        return priority_queue if priority == "priority" else normal_queue

    monkeypatch.setattr("app.services.run_service.get_run_queue", fake_get_run_queue)

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
        yield client, testing_session_local, tenant_id, project_id, api_key_plaintext, normal_queue, priority_queue

    app.dependency_overrides.clear()
    if hasattr(app.state, "auth_session_factory"):
        delattr(app.state, "auth_session_factory")
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def _seed_trace_and_campaign(db: Session, *, project_id: UUID, attempts_count: int = 10) -> tuple[UUID, UUID]:
    trace_id = uuid4()
    campaign_id = uuid4()
    db.add(
        Trace(
            trace_id=trace_id,
            project_id=project_id,
            source="billing-test",
            s3_key=f"traces/{trace_id}.json",
        )
    )
    db.add(
        Campaign(
            campaign_id=campaign_id,
            project_id=project_id,
            name="Billing Campaign",
            mutation_set=[{"mutation_id": "baseline", "tool": "jira.create_issue", "args": {"title": "Billing"}}],
            eval_set={"attempts_count": attempts_count},
        )
    )
    db.commit()
    return trace_id, campaign_id


def test_billing_endpoints_bootstrap_plans_and_wallet(
    billing_test_context: tuple[TestClient, sessionmaker[Session], UUID, UUID, str, FakeQueue, FakeQueue],
) -> None:
    client, _, _, _, _, _, _ = billing_test_context

    plans_response = client.get("/v1/billing/plans")
    assert plans_response.status_code == 200
    assert [item["name"] for item in plans_response.json()] == ["Free", "Pro", "Team", "Enterprise"]

    subscription_response = client.get("/v1/billing/subscription")
    assert subscription_response.status_code == 200
    subscription = subscription_response.json()
    assert subscription["plan_name"] == "Free"
    assert subscription["queue_priority"] == "normal"

    wallet_response = client.get("/v1/billing/credits")
    assert wallet_response.status_code == 200
    wallet = wallet_response.json()
    assert wallet["balance"] == 250
    assert wallet["monthly_credits"] == 250
    assert wallet["topup_credits"] == 0


def test_subscribe_and_topup_update_wallet_and_workspace_tier(
    billing_test_context: tuple[TestClient, sessionmaker[Session], UUID, UUID, str, FakeQueue, FakeQueue],
) -> None:
    client, testing_session_local, tenant_id, _, _, _, _ = billing_test_context

    subscribe_response = client.post("/v1/billing/subscribe", json={"plan_id": str(PRO_PLAN_ID)})
    assert subscribe_response.status_code == 200
    subscription = subscribe_response.json()
    assert subscription["plan_name"] == "Pro"
    assert subscription["queue_priority"] == "priority"

    topup_response = client.post("/v1/billing/topup", json={"credits": 1000})
    assert topup_response.status_code == 200
    wallet = topup_response.json()
    assert wallet["balance"] == 3000
    assert wallet["topup_credits"] == 1000
    assert wallet["queue_priority"] == "priority"

    with testing_session_local() as db:
        tenant = db.scalar(select(Tenant).where(Tenant.tenant_id == tenant_id))
        assert isinstance(tenant, Tenant)
        assert tenant.pricing_tier == "team"


def test_post_run_consumes_credits_and_uses_priority_queue(
    billing_test_context: tuple[TestClient, sessionmaker[Session], UUID, UUID, str, FakeQueue, FakeQueue],
) -> None:
    client, testing_session_local, _, project_id, _, normal_queue, priority_queue = billing_test_context

    client.post("/v1/billing/subscribe", json={"plan_id": str(PRO_PLAN_ID)})

    with testing_session_local() as db:
        trace_id, campaign_id = _seed_trace_and_campaign(db, project_id=project_id, attempts_count=10)

    response = client.post(
        "/v1/runs",
        json={"trace_id": str(trace_id), "campaign_id": str(campaign_id)},
    )

    assert response.status_code == 201
    assert not normal_queue.calls
    assert len(priority_queue.calls) == 1

    with testing_session_local() as db:
        project = db.scalar(select(Project).where(Project.project_id == project_id))
        assert isinstance(project, Project)
        assert isinstance(project.owner_id, UUID)
        wallet = db.scalar(select(CreditWallet).where(CreditWallet.user_id == project.owner_id))
        assert isinstance(wallet, CreditWallet)
        assert wallet.balance == 1980
        assert wallet.monthly_credits == 1980


def test_run_is_blocked_when_wallet_is_short(
    billing_test_context: tuple[TestClient, sessionmaker[Session], UUID, UUID, str, FakeQueue, FakeQueue],
) -> None:
    client, testing_session_local, _, project_id, _, _, _ = billing_test_context

    with testing_session_local() as db:
        project = db.scalar(select(Project).where(Project.project_id == project_id))
        assert isinstance(project, Project)
        assert isinstance(project.owner_id, UUID)
        _, wallet, _ = ensure_user_billing(db, user_id=project.owner_id, pricing_tier="starter")
        wallet.balance = 10
        wallet.monthly_credits = 10
        wallet.topup_credits = 0
        db.add(wallet)
        trace_id, campaign_id = _seed_trace_and_campaign(db, project_id=project_id, attempts_count=10)
        db.commit()

    response = client.post(
        "/v1/runs",
        json={"trace_id": str(trace_id), "campaign_id": str(campaign_id)},
    )

    assert response.status_code == 402
    assert response.json()["detail"] == "Insufficient credits"


def test_monthly_credit_grant_replenishes_due_subscription(
    billing_test_context: tuple[TestClient, sessionmaker[Session], UUID, UUID, str, FakeQueue, FakeQueue],
) -> None:
    _, testing_session_local, _, project_id, _, _, _ = billing_test_context

    with testing_session_local() as db:
        project = db.scalar(select(Project).where(Project.project_id == project_id))
        assert isinstance(project, Project)
        assert isinstance(project.owner_id, UUID)
        subscription, wallet, plan = ensure_user_billing(
            db,
            user_id=project.owner_id,
            pricing_tier="starter",
        )
        wallet.balance = 0
        wallet.monthly_credits = 0
        subscription.renewal_date = datetime.now(UTC) - timedelta(days=1)
        db.add_all([subscription, wallet])
        db.commit()

        result = grant_due_monthly_credits(db, now=datetime.now(UTC))
        assert result["subscriptions_updated"] == 1
        assert result["credits_granted"] == plan.monthly_credits

        db.refresh(subscription)
        db.refresh(wallet)
        assert wallet.balance == plan.monthly_credits
        assert wallet.monthly_credits == plan.monthly_credits
        renewal_date = subscription.renewal_date
        if renewal_date.tzinfo is None:
            renewal_date = renewal_date.replace(tzinfo=UTC)
        assert renewal_date > datetime.now(UTC)
