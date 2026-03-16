"""Tests for credit-gate enforcement on CI campaign runs."""

from __future__ import annotations

from collections.abc import Generator
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from app.db import get_db
from app.main import app
from app.models import Base, Campaign, CreditWallet, Project, Tenant, Trace, User, UserSubscription
from app.services.billing_service import (
    FREE_PLAN_ID,
    MUTATION_CAMPAIGN_CREDIT_COST,
    consume_credits_for_project_campaign,
)
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .conftest import seed_tenant_project_and_key


class FakeQueue:
    def __init__(self) -> None:
        self.calls: list[tuple[tuple[object, ...], dict[str, object]]] = []

    def enqueue(self, *args: object, **kwargs: object) -> object:
        self.calls.append((args, kwargs))
        return {"queued": True}


@pytest.fixture()
def credit_ci_context(
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[tuple[TestClient, sessionmaker[Session], FakeQueue, UUID], None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    with testing_session_local() as db:
        _, project_id, _, _ = seed_tenant_project_and_key(db)

    fake_queue = FakeQueue()
    monkeypatch.setattr("app.services.run_service.get_run_queue", lambda **kw: fake_queue)
    monkeypatch.delenv("CI_TOKEN", raising=False)

    def override_get_db() -> Generator[Session, None, None]:
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client, testing_session_local, fake_queue, project_id

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def _seed_trace_and_campaign(
    db: Session,
    *,
    project_id: UUID,
    attempts_count: int = 5,
) -> tuple[UUID, UUID]:
    trace_id = uuid4()
    campaign_id = uuid4()
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
            name="Credit Test Campaign",
            mutation_set=[{"type": "noop"}],
            eval_set={"checks": ["status"], "attempts_count": attempts_count},
        )
    )
    db.commit()
    return trace_id, campaign_id


def _seed_user_with_wallet(
    db: Session,
    *,
    project_id: UUID,
    balance: int,
) -> UUID:
    """Create a User, attach them as project owner, and give them a wallet with `balance` credits."""
    user_id = uuid4()
    db.add(User(user_id=user_id, email=f"user-{user_id}@example.com"))
    now = datetime.now(UTC)
    db.add(
        UserSubscription(
            user_subscription_id=uuid4(),
            user_id=user_id,
            plan_id=FREE_PLAN_ID,
            status="active",
            start_date=now,
            renewal_date=now + timedelta(days=30),
        )
    )
    db.add(
        CreditWallet(
            wallet_id=uuid4(),
            user_id=user_id,
            balance=balance,
            monthly_credits=balance,
            topup_credits=0,
        )
    )
    project = db.scalar(select(Project).where(Project.project_id == project_id))
    assert project is not None
    project.owner_id = user_id
    db.add(project)
    db.commit()
    return user_id


# ---------------------------------------------------------------------------
# consume_credits_for_project_campaign unit tests
# ---------------------------------------------------------------------------


def test_consume_credits_for_project_campaign_no_owner_returns_none(
    credit_ci_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
) -> None:
    _, testing_session_local, _, project_id = credit_ci_context
    with testing_session_local() as db:
        _, campaign_id = _seed_trace_and_campaign(db, project_id=project_id)
        campaign = db.scalar(select(Campaign).where(Campaign.campaign_id == campaign_id))
        assert campaign is not None
        result = consume_credits_for_project_campaign(db, project_id=project_id, campaign=campaign)
    assert result is None


def test_consume_credits_for_project_campaign_deducts_correct_amount(
    credit_ci_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
) -> None:
    _, testing_session_local, _, project_id = credit_ci_context
    starting_balance = 500
    with testing_session_local() as db:
        user_id = _seed_user_with_wallet(db, project_id=project_id, balance=starting_balance)
        _, campaign_id = _seed_trace_and_campaign(db, project_id=project_id, attempts_count=5)
        campaign = db.scalar(select(Campaign).where(Campaign.campaign_id == campaign_id))
        assert campaign is not None
        wallet = consume_credits_for_project_campaign(db, project_id=project_id, campaign=campaign)
        assert wallet is not None
        assert wallet.balance == starting_balance - MUTATION_CAMPAIGN_CREDIT_COST
        _ = user_id


def test_consume_credits_for_project_campaign_raises_when_insufficient(
    credit_ci_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
) -> None:
    from app.services.billing_service import InsufficientCreditsError

    _, testing_session_local, _, project_id = credit_ci_context
    with testing_session_local() as db:
        _seed_user_with_wallet(db, project_id=project_id, balance=1)
        _, campaign_id = _seed_trace_and_campaign(db, project_id=project_id, attempts_count=5)
        campaign = db.scalar(select(Campaign).where(Campaign.campaign_id == campaign_id))
        assert campaign is not None
        with pytest.raises(InsufficientCreditsError):
            consume_credits_for_project_campaign(db, project_id=project_id, campaign=campaign)


# ---------------------------------------------------------------------------
# /v1/ci/runs HTTP integration tests
# ---------------------------------------------------------------------------


def test_ci_run_proceeds_when_project_has_no_owner(
    credit_ci_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
) -> None:
    """Projects without an owner_id bypass the credit gate and run normally."""
    client, testing_session_local, fake_queue, project_id = credit_ci_context
    with testing_session_local() as db:
        trace_id, campaign_id = _seed_trace_and_campaign(db, project_id=project_id)

    response = client.post(
        "/v1/ci/runs",
        json={
            "trace_id": str(trace_id),
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
        },
    )
    assert response.status_code == 201
    assert "run_id" in response.json()
    assert len(fake_queue.calls) == 1


def test_ci_run_proceeds_with_sufficient_credits(
    credit_ci_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
) -> None:
    """Projects whose owner has enough credits should pass and see the balance deducted."""
    client, testing_session_local, fake_queue, project_id = credit_ci_context
    starting_balance = 500
    with testing_session_local() as db:
        user_id = _seed_user_with_wallet(db, project_id=project_id, balance=starting_balance)
        trace_id, campaign_id = _seed_trace_and_campaign(
            db, project_id=project_id, attempts_count=5
        )

    response = client.post(
        "/v1/ci/runs",
        json={
            "trace_id": str(trace_id),
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
        },
    )
    assert response.status_code == 201
    assert len(fake_queue.calls) == 1

    with testing_session_local() as db:
        wallet = db.scalar(select(CreditWallet).where(CreditWallet.user_id == user_id))
        assert wallet is not None
        assert wallet.balance == starting_balance - MUTATION_CAMPAIGN_CREDIT_COST


def test_ci_run_returns_402_when_insufficient_credits(
    credit_ci_context: tuple[TestClient, sessionmaker[Session], FakeQueue, UUID],
) -> None:
    """Projects whose owner has too few credits get a 402 and no run is enqueued."""
    client, testing_session_local, fake_queue, project_id = credit_ci_context
    with testing_session_local() as db:
        _seed_user_with_wallet(db, project_id=project_id, balance=1)
        trace_id, campaign_id = _seed_trace_and_campaign(
            db, project_id=project_id, attempts_count=5
        )

    response = client.post(
        "/v1/ci/runs",
        json={
            "trace_id": str(trace_id),
            "campaign_id": str(campaign_id),
            "thresholds": {"min_pass_rate": 0.8, "max_unsafe": 0},
        },
    )
    assert response.status_code == 402
    assert response.json()["detail"] == "insufficient_credits"
    assert len(fake_queue.calls) == 0
