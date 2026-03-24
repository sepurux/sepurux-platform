from __future__ import annotations

from collections.abc import Generator
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import (
    Base,
    BillingWebhookEvent,
    Campaign,
    CreditWallet,
    Project,
    Tenant,
    Trace,
)
from app.services.billing_service import (
    PRO_PLAN_ID,
    ensure_user_billing,
    get_user_subscription,
    grant_due_monthly_credits,
    subscribe_user,
)
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import auth_headers, seed_project_membership_api_key


class FakeQueue:
    def __init__(self) -> None:
        self.calls: list[tuple[tuple[object, ...], dict[str, object]]] = []
        self.fail_with: Exception | None = None

    def enqueue(self, *args: object, **kwargs: object) -> object:
        if self.fail_with is not None:
            raise self.fail_with
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
        tenant_id, project_id, _, _, api_key_plaintext = seed_project_membership_api_key(
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


def _seed_trace_and_campaign(
    db: Session, *, project_id: UUID, attempts_count: int = 10
) -> tuple[UUID, UUID]:
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
            mutation_set=[
                {
                    "mutation_id": "baseline",
                    "tool": "jira.create_issue",
                    "args": {"title": "Billing"},
                }
            ],
            eval_set={"attempts_count": attempts_count},
        )
    )
    db.commit()
    return trace_id, campaign_id


def _project_owner_id(db: Session, *, project_id: UUID) -> UUID:
    project = db.scalar(select(Project).where(Project.project_id == project_id))
    assert isinstance(project, Project)
    assert isinstance(project.owner_id, UUID)
    return project.owner_id


def test_billing_endpoints_bootstrap_plans_and_wallet(
    billing_test_context: tuple[
        TestClient, sessionmaker[Session], UUID, UUID, str, FakeQueue, FakeQueue
    ],
) -> None:
    client, _, _, _, _, _, _ = billing_test_context

    plans_response = client.get("/v1/billing/plans")
    assert plans_response.status_code == 200
    plans = plans_response.json()
    assert [item["name"] for item in plans] == ["Free", "Pro", "Team", "Enterprise"]
    assert all("checkout_enabled" in item for item in plans)

    subscription_response = client.get("/v1/billing/subscription")
    assert subscription_response.status_code == 200
    subscription = subscription_response.json()
    assert subscription["plan_name"] == "Free"
    assert subscription["queue_priority"] == "normal"
    assert subscription["portal_available"] is False

    wallet_response = client.get("/v1/billing/credits")
    assert wallet_response.status_code == 200
    wallet = wallet_response.json()
    assert wallet["balance"] == 0
    assert wallet["monthly_credits"] == 0
    assert wallet["topup_credits"] == 0


def test_billing_routes_return_redirect_sessions_without_local_mutation(
    billing_test_context: tuple[
        TestClient, sessionmaker[Session], UUID, UUID, str, FakeQueue, FakeQueue
    ],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, tenant_id, project_id, _, _, _ = billing_test_context

    monkeypatch.setattr(
        "app.routes.billing.create_subscription_billing_redirect",
        lambda *args, **kwargs: {
            "provider": "stripe",
            "flow": "checkout",
            "url": "https://checkout.stripe.test/sub_pro",
            "session_id": "cs_sub_123",
        },
    )
    monkeypatch.setattr(
        "app.routes.billing.create_topup_billing_redirect",
        lambda *args, **kwargs: {
            "provider": "stripe",
            "flow": "checkout",
            "url": "https://checkout.stripe.test/topup",
            "session_id": "cs_topup_123",
        },
    )
    monkeypatch.setattr(
        "app.routes.billing.create_billing_portal_redirect",
        lambda *args, **kwargs: {
            "provider": "stripe",
            "flow": "portal",
            "url": "https://billing.stripe.test/portal",
            "session_id": None,
        },
    )

    subscribe_response = client.post("/v1/billing/subscribe", json={"plan_id": str(PRO_PLAN_ID)})
    assert subscribe_response.status_code == 200
    assert subscribe_response.json() == {
        "provider": "stripe",
        "flow": "checkout",
        "url": "https://checkout.stripe.test/sub_pro",
        "session_id": "cs_sub_123",
    }

    topup_response = client.post("/v1/billing/topup", json={"credits": 1000})
    assert topup_response.status_code == 200
    assert topup_response.json() == {
        "provider": "stripe",
        "flow": "checkout",
        "url": "https://checkout.stripe.test/topup",
        "session_id": "cs_topup_123",
    }

    portal_response = client.post("/v1/billing/portal")
    assert portal_response.status_code == 200
    assert portal_response.json() == {
        "provider": "stripe",
        "flow": "portal",
        "url": "https://billing.stripe.test/portal",
        "session_id": None,
    }

    with testing_session_local() as db:
        owner_id = _project_owner_id(db, project_id=project_id)
        subscription = get_user_subscription(db, user_id=owner_id)
        wallet = db.scalar(select(CreditWallet).where(CreditWallet.user_id == owner_id))
        tenant = db.scalar(select(Tenant).where(Tenant.tenant_id == tenant_id))
        assert wallet is not None
        assert subscription is not None
        assert isinstance(tenant, Tenant)
        assert subscription.plan_id != PRO_PLAN_ID
        assert wallet.balance == 0
        assert wallet.topup_credits == 0
        assert tenant.pricing_tier == "starter"


def test_subscription_checkout_webhook_activates_plan_once(
    billing_test_context: tuple[
        TestClient, sessionmaker[Session], UUID, UUID, str, FakeQueue, FakeQueue
    ],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, tenant_id, project_id, _, _, _ = billing_test_context

    with testing_session_local() as db:
        owner_id = _project_owner_id(db, project_id=project_id)

    event = {
        "id": "evt_checkout_sub_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_sub_123",
                "mode": "subscription",
                "customer": "cus_123",
                "subscription": "sub_123",
                "metadata": {
                    "operation": "subscribe",
                    "user_id": str(owner_id),
                    "project_id": str(project_id),
                    "tenant_id": str(tenant_id),
                    "plan_id": str(PRO_PLAN_ID),
                },
            }
        },
    }
    monkeypatch.setattr(
        "app.services.stripe_billing_service.construct_stripe_event",
        lambda **kwargs: event,
    )

    first_response = client.post(
        "/v1/billing/webhook", content=b"{}", headers={"stripe-signature": "sig"}
    )
    second_response = client.post(
        "/v1/billing/webhook", content=b"{}", headers={"stripe-signature": "sig"}
    )

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert first_response.json()["status"] == "processed"
    assert second_response.json()["status"] == "ignored"

    with testing_session_local() as db:
        owner_id = _project_owner_id(db, project_id=project_id)
        subscription = get_user_subscription(db, user_id=owner_id)
        wallet = db.scalar(select(CreditWallet).where(CreditWallet.user_id == owner_id))
        tenant = db.scalar(select(Tenant).where(Tenant.tenant_id == tenant_id))
        events = list(db.scalars(select(BillingWebhookEvent)))

        assert subscription is not None
        assert wallet is not None
        assert isinstance(tenant, Tenant)
        assert subscription.plan_id == PRO_PLAN_ID
        assert subscription.stripe_customer_id == "cus_123"
        assert subscription.stripe_subscription_id == "sub_123"
        assert wallet.balance == 2000
        assert wallet.monthly_credits == 2000
        assert wallet.topup_credits == 0
        assert tenant.pricing_tier == "starter"
        assert len(events) == 1


def test_topup_checkout_webhook_adds_credits_once(
    billing_test_context: tuple[
        TestClient, sessionmaker[Session], UUID, UUID, str, FakeQueue, FakeQueue
    ],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, testing_session_local, _, project_id, _, _, _ = billing_test_context

    with testing_session_local() as db:
        owner_id = _project_owner_id(db, project_id=project_id)

    event = {
        "id": "evt_checkout_topup_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_topup_123",
                "mode": "payment",
                "payment_status": "paid",
                "metadata": {
                    "operation": "topup",
                    "user_id": str(owner_id),
                    "project_id": str(project_id),
                    "credits": "1000",
                },
            }
        },
    }
    monkeypatch.setattr(
        "app.services.stripe_billing_service.construct_stripe_event",
        lambda **kwargs: event,
    )

    first_response = client.post(
        "/v1/billing/webhook", content=b"{}", headers={"stripe-signature": "sig"}
    )
    second_response = client.post(
        "/v1/billing/webhook", content=b"{}", headers={"stripe-signature": "sig"}
    )

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert first_response.json()["status"] == "processed"
    assert second_response.json()["status"] == "ignored"

    with testing_session_local() as db:
        owner_id = _project_owner_id(db, project_id=project_id)
        wallet = db.scalar(select(CreditWallet).where(CreditWallet.user_id == owner_id))
        events = list(db.scalars(select(BillingWebhookEvent)))

        assert wallet is not None
        assert wallet.balance == 1000
        assert wallet.monthly_credits == 0
        assert wallet.topup_credits == 1000
        assert len(events) == 1


def test_post_run_consumes_credits_and_uses_priority_queue(
    billing_test_context: tuple[
        TestClient, sessionmaker[Session], UUID, UUID, str, FakeQueue, FakeQueue
    ],
) -> None:
    client, testing_session_local, tenant_id, project_id, _, normal_queue, priority_queue = (
        billing_test_context
    )

    with testing_session_local() as db:
        owner_id = _project_owner_id(db, project_id=project_id)
        subscribe_user(db, user_id=owner_id, plan_id=PRO_PLAN_ID, tenant_id=tenant_id)
        trace_id, campaign_id = _seed_trace_and_campaign(
            db, project_id=project_id, attempts_count=10
        )

    response = client.post(
        "/v1/runs",
        json={"trace_id": str(trace_id), "campaign_id": str(campaign_id)},
    )

    assert response.status_code == 201
    assert not normal_queue.calls
    assert len(priority_queue.calls) == 1

    with testing_session_local() as db:
        owner_id = _project_owner_id(db, project_id=project_id)
        wallet = db.scalar(select(CreditWallet).where(CreditWallet.user_id == owner_id))
        assert isinstance(wallet, CreditWallet)
        assert wallet.balance == 1980
        assert wallet.monthly_credits == 1980


def test_run_is_blocked_when_wallet_is_short(
    billing_test_context: tuple[
        TestClient, sessionmaker[Session], UUID, UUID, str, FakeQueue, FakeQueue
    ],
) -> None:
    client, testing_session_local, _, project_id, _, _, _ = billing_test_context

    with testing_session_local() as db:
        owner_id = _project_owner_id(db, project_id=project_id)
        _, wallet, _ = ensure_user_billing(db, user_id=owner_id, pricing_tier="starter")
        wallet.balance = 10
        wallet.monthly_credits = 10
        wallet.topup_credits = 0
        db.add(wallet)
        trace_id, campaign_id = _seed_trace_and_campaign(
            db, project_id=project_id, attempts_count=10
        )
        db.commit()

    response = client.post(
        "/v1/runs",
        json={"trace_id": str(trace_id), "campaign_id": str(campaign_id)},
    )

    assert response.status_code == 402
    assert response.json()["detail"] == "Insufficient credits"


def test_ensure_user_billing_creates_subscription_without_duplicate_wallet(
    billing_test_context: tuple[
        TestClient, sessionmaker[Session], UUID, UUID, str, FakeQueue, FakeQueue
    ],
) -> None:
    _, testing_session_local, _, project_id, _, _, _ = billing_test_context

    with testing_session_local() as db:
        owner_id = _project_owner_id(db, project_id=project_id)
        db.add(
            CreditWallet(
                wallet_id=uuid4(),
                user_id=owner_id,
                balance=200,
                monthly_credits=120,
                topup_credits=80,
            )
        )
        db.commit()

        subscription, wallet, _ = ensure_user_billing(db, user_id=owner_id, pricing_tier="starter")

        wallets = list(db.scalars(select(CreditWallet).where(CreditWallet.user_id == owner_id)))
        assert subscription.user_id == owner_id
        assert wallet.user_id == owner_id
        assert len(wallets) == 1
        assert wallet.balance == wallet.monthly_credits + wallet.topup_credits


def test_post_run_refunds_credits_when_enqueue_fails(
    billing_test_context: tuple[
        TestClient, sessionmaker[Session], UUID, UUID, str, FakeQueue, FakeQueue
    ],
) -> None:
    client, testing_session_local, tenant_id, project_id, _, _, priority_queue = (
        billing_test_context
    )

    with testing_session_local() as db:
        owner_id = _project_owner_id(db, project_id=project_id)
        subscribe_user(db, user_id=owner_id, plan_id=PRO_PLAN_ID, tenant_id=tenant_id)
        trace_id, campaign_id = _seed_trace_and_campaign(
            db, project_id=project_id, attempts_count=10
        )

    priority_queue.fail_with = RuntimeError("queue unavailable")
    with pytest.raises(RuntimeError, match="queue unavailable"):
        client.post(
            "/v1/runs",
            json={"trace_id": str(trace_id), "campaign_id": str(campaign_id)},
        )

    with testing_session_local() as db:
        owner_id = _project_owner_id(db, project_id=project_id)
        wallet = db.scalar(select(CreditWallet).where(CreditWallet.user_id == owner_id))
        assert isinstance(wallet, CreditWallet)
        assert wallet.balance == 2000
        assert wallet.monthly_credits == 1980
        assert wallet.topup_credits == 20


def test_monthly_credit_grant_replenishes_due_subscription(
    billing_test_context: tuple[
        TestClient, sessionmaker[Session], UUID, UUID, str, FakeQueue, FakeQueue
    ],
) -> None:
    _, testing_session_local, tenant_id, project_id, _, _, _ = billing_test_context

    with testing_session_local() as db:
        owner_id = _project_owner_id(db, project_id=project_id)
        subscription, wallet, plan = subscribe_user(
            db,
            user_id=owner_id,
            plan_id=PRO_PLAN_ID,
            tenant_id=tenant_id,
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


def test_monthly_credit_grant_skips_stripe_managed_subscription(
    billing_test_context: tuple[
        TestClient, sessionmaker[Session], UUID, UUID, str, FakeQueue, FakeQueue
    ],
) -> None:
    _, testing_session_local, tenant_id, project_id, _, _, _ = billing_test_context

    with testing_session_local() as db:
        owner_id = _project_owner_id(db, project_id=project_id)
        subscription, wallet, _ = subscribe_user(
            db,
            user_id=owner_id,
            plan_id=PRO_PLAN_ID,
            tenant_id=tenant_id,
            stripe_customer_id="cus_123",
            stripe_subscription_id="sub_123",
            stripe_price_id="price_pro_123",
        )
        subscription.renewal_date = datetime.now(UTC) - timedelta(days=1)
        wallet.balance = 0
        wallet.monthly_credits = 0
        db.add_all([subscription, wallet])
        db.commit()

        result = grant_due_monthly_credits(db, now=datetime.now(UTC))
        assert result["subscriptions_updated"] == 0
        assert result["credits_granted"] == 0

        db.refresh(subscription)
        db.refresh(wallet)
        assert wallet.balance == 0
        assert wallet.monthly_credits == 0
