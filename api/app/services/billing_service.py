from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

from app.auth import TenantAuthContext
from app.models import (
    BillingWebhookEvent,
    CreditTransaction,
    CreditWallet,
    Project,
    SubscriptionPlan,
    Tenant,
    User,
    UserSubscription,
)
from app.services.pricing_service import DEFAULT_PRICING_TIER, normalize_pricing_tier
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

FREE_PLAN_ID = UUID("30000000-0000-0000-0000-000000000001")
PRO_PLAN_ID = UUID("30000000-0000-0000-0000-000000000002")
TEAM_PLAN_ID = UUID("30000000-0000-0000-0000-000000000003")
ENTERPRISE_PLAN_ID = UUID("30000000-0000-0000-0000-000000000004")
STRIPE_PROVIDER = "stripe"

TRANSACTION_USAGE = "usage"
TRANSACTION_MONTHLY_GRANT = "monthly_grant"
TRANSACTION_TOPUP_PURCHASE = "topup_purchase"
TRANSACTION_REFUND = "refund"

QUEUE_NORMAL = "normal"
QUEUE_PRIORITY = "priority"
LOW_CREDIT_THRESHOLD = 50
FREE_SUBSCRIPTION_STATUS = "free"

TRACE_REPLAY_CREDIT_COST = 5
MUTATION_CAMPAIGN_CREDIT_COST = 20
LARGE_CAMPAIGN_CREDIT_COST = 50
LARGE_CAMPAIGN_ATTEMPT_THRESHOLD = 50
BILLING_CYCLE_DAYS = 30

SIGNUP_CREDITS = int(os.getenv("SIGNUP_CREDITS", "100"))


@dataclass(frozen=True)
class PlanSeed:
    plan_id: UUID
    name: str
    monthly_price: int
    monthly_credits: int
    features: dict[str, Any]


DEFAULT_PLAN_SEEDS: tuple[PlanSeed, ...] = (
    PlanSeed(
        plan_id=FREE_PLAN_ID,
        name="Free",
        monthly_price=0,
        monthly_credits=0,
        features={
            "workspace_tier": "starter",
            "queue_priority": QUEUE_NORMAL,
            "highlights": [f"{SIGNUP_CREDITS} signup credits", "Single workspace"],
        },
    ),
    PlanSeed(
        plan_id=PRO_PLAN_ID,
        name="Pro",
        monthly_price=49,
        monthly_credits=2000,
        features={
            "workspace_tier": "team",
            "queue_priority": QUEUE_PRIORITY,
            "highlights": ["2,000 credits / month", "Priority execution"],
        },
    ),
    PlanSeed(
        plan_id=TEAM_PLAN_ID,
        name="Team",
        monthly_price=199,
        monthly_credits=10000,
        features={
            "workspace_tier": "team",
            "queue_priority": QUEUE_PRIORITY,
            "highlights": ["10,000 credits / month", "Shared workspace access"],
        },
    ),
    PlanSeed(
        plan_id=ENTERPRISE_PLAN_ID,
        name="Enterprise",
        monthly_price=999,
        monthly_credits=50000,
        features={
            "workspace_tier": "enterprise",
            "queue_priority": QUEUE_PRIORITY,
            "highlights": ["50,000 credits / month", "Enterprise governance"],
        },
    ),
)

PLAN_NAME_BY_PRICING_TIER = {
    "starter": "Free",
    "team": "Team",
    "enterprise": "Enterprise",
}

STRIPE_PRICE_ENV_BY_PLAN_NAME = {
    "Pro": "STRIPE_PRICE_PRO_MONTHLY",
    "Team": "STRIPE_PRICE_TEAM_MONTHLY",
    "Enterprise": "STRIPE_PRICE_ENTERPRISE_MONTHLY",
}


class InsufficientCreditsError(Exception):
    pass


class BillingSubjectNotFoundError(Exception):
    pass


def utcnow() -> datetime:
    return datetime.now(UTC)


def ensure_default_subscription_plans(db: Session) -> list[SubscriptionPlan]:
    existing = {str(plan.plan_id): plan for plan in db.scalars(select(SubscriptionPlan)).all()}
    changed = False
    for seed in DEFAULT_PLAN_SEEDS:
        record = existing.get(str(seed.plan_id))
        if record is None:
            record = SubscriptionPlan(
                plan_id=seed.plan_id,
                name=seed.name,
                monthly_price=seed.monthly_price,
                monthly_credits=seed.monthly_credits,
                features=seed.features,
            )
            db.add(record)
            existing[str(seed.plan_id)] = record
            changed = True
            continue
        if (
            record.name != seed.name
            or record.monthly_price != seed.monthly_price
            or record.monthly_credits != seed.monthly_credits
            or record.features != seed.features
        ):
            record.name = seed.name
            record.monthly_price = seed.monthly_price
            record.monthly_credits = seed.monthly_credits
            record.features = seed.features
            db.add(record)
            changed = True
    if changed:
        db.commit()
    return list(
        db.scalars(
            select(SubscriptionPlan).order_by(
                SubscriptionPlan.monthly_price.asc(),
                SubscriptionPlan.name.asc(),
            )
        )
    )


def list_subscription_plans(db: Session) -> list[SubscriptionPlan]:
    ensure_default_subscription_plans(db)
    return list(
        db.scalars(
            select(SubscriptionPlan).order_by(
                SubscriptionPlan.monthly_price.asc(),
                SubscriptionPlan.name.asc(),
            )
        )
    )


def get_subscription_plan(
    db: Session, *, plan_id: UUID | None = None, name: str | None = None
) -> SubscriptionPlan | None:
    ensure_default_subscription_plans(db)
    if plan_id is not None:
        return db.scalar(select(SubscriptionPlan).where(SubscriptionPlan.plan_id == plan_id))
    if name is None:
        return None
    return db.scalar(select(SubscriptionPlan).where(SubscriptionPlan.name == name.strip()))


def get_user_subscription(db: Session, *, user_id: UUID) -> UserSubscription | None:
    return db.scalar(select(UserSubscription).where(UserSubscription.user_id == user_id))


def get_credit_wallet(db: Session, *, user_id: UUID) -> CreditWallet | None:
    return db.scalar(select(CreditWallet).where(CreditWallet.user_id == user_id))


def get_user_subscription_by_stripe_subscription_id(
    db: Session,
    *,
    stripe_subscription_id: str,
) -> UserSubscription | None:
    return db.scalar(
        select(UserSubscription).where(
            UserSubscription.stripe_subscription_id == stripe_subscription_id
        )
    )


def _default_plan_name(pricing_tier: str | None) -> str:
    normalized_tier = normalize_pricing_tier(pricing_tier or DEFAULT_PRICING_TIER)
    return PLAN_NAME_BY_PRICING_TIER[normalized_tier]


def _pricing_tier_for_project(db: Session, *, project_id: UUID) -> str:
    project = db.scalar(select(Project).where(Project.project_id == project_id))
    if not isinstance(project, Project):
        return DEFAULT_PRICING_TIER
    tenant = db.scalar(select(Tenant).where(Tenant.tenant_id == project.tenant_id))
    if not isinstance(tenant, Tenant):
        return DEFAULT_PRICING_TIER
    return normalize_pricing_tier(tenant.pricing_tier)


def _queue_priority_for_plan(plan: SubscriptionPlan | None) -> str:
    if not isinstance(plan, SubscriptionPlan):
        return QUEUE_NORMAL
    features = plan.features if isinstance(plan.features, dict) else {}
    queue_priority = features.get("queue_priority")
    if isinstance(queue_priority, str) and queue_priority == QUEUE_PRIORITY:
        return QUEUE_PRIORITY
    return QUEUE_NORMAL


def _workspace_tier_for_plan(plan: SubscriptionPlan | None) -> str:
    if not isinstance(plan, SubscriptionPlan):
        return DEFAULT_PRICING_TIER
    features = plan.features if isinstance(plan.features, dict) else {}
    workspace_tier = features.get("workspace_tier")
    if isinstance(workspace_tier, str):
        return normalize_pricing_tier(workspace_tier)
    return DEFAULT_PRICING_TIER


def _is_free_plan(plan: SubscriptionPlan | None) -> bool:
    return isinstance(plan, SubscriptionPlan) and plan.plan_id == FREE_PLAN_ID


def self_serve_checkout_enabled_for_plan(plan: SubscriptionPlan | None) -> bool:
    if not isinstance(plan, SubscriptionPlan):
        return False
    if plan.monthly_price <= 0:
        return False
    env_name = STRIPE_PRICE_ENV_BY_PLAN_NAME.get(plan.name)
    if env_name is None:
        return False
    return bool(os.getenv("STRIPE_SECRET_KEY")) and bool(os.getenv(env_name))


def _create_credit_transaction(
    db: Session,
    *,
    user_id: UUID,
    amount: int,
    transaction_type: str,
    reason: str,
) -> CreditTransaction:
    record = CreditTransaction(
        credit_transaction_id=uuid4(),
        user_id=user_id,
        amount=amount,
        type=transaction_type,
        reason=reason,
    )
    db.add(record)
    return record


def grant_signup_credits(db: Session, *, user_id: UUID) -> None:
    if SIGNUP_CREDITS <= 0:
        return
    wallet = db.scalar(select(CreditWallet).where(CreditWallet.user_id == user_id))
    if wallet is None:
        return
    wallet.topup_credits += SIGNUP_CREDITS
    wallet.balance += SIGNUP_CREDITS
    db.add(wallet)
    _create_credit_transaction(
        db,
        user_id=user_id,
        amount=SIGNUP_CREDITS,
        transaction_type=TRANSACTION_TOPUP_PURCHASE,
        reason="signup bonus",
    )
    db.commit()


def refund_credits(
    db: Session,
    *,
    user_id: UUID,
    amount: int,
    reason: str,
    pricing_tier: str | None = None,
) -> CreditWallet:
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Refund amount must be greater than zero",
        )

    _, wallet, _ = ensure_user_billing(db, user_id=user_id, pricing_tier=pricing_tier)
    wallet.topup_credits += amount
    wallet.balance = wallet.monthly_credits + wallet.topup_credits
    db.add(wallet)
    _create_credit_transaction(
        db,
        user_id=user_id,
        amount=amount,
        transaction_type=TRANSACTION_REFUND,
        reason=reason,
    )
    db.commit()
    db.refresh(wallet)
    return wallet


def has_processed_billing_webhook_event(db: Session, *, event_id: str) -> bool:
    return (
        db.scalar(
            select(BillingWebhookEvent.event_id).where(BillingWebhookEvent.event_id == event_id)
        )
        is not None
    )


def mark_billing_webhook_event_processed(
    db: Session,
    *,
    event_id: str,
    event_type: str,
    provider: str = STRIPE_PROVIDER,
) -> BillingWebhookEvent:
    record = BillingWebhookEvent(
        event_id=event_id,
        event_type=event_type,
        provider=provider,
    )
    db.add(record)
    return record


def ensure_user_billing(
    db: Session,
    *,
    user_id: UUID,
    pricing_tier: str | None = None,
) -> tuple[UserSubscription, CreditWallet, SubscriptionPlan]:
    ensure_default_subscription_plans(db)
    subscription = get_user_subscription(db, user_id=user_id)
    wallet = get_credit_wallet(db, user_id=user_id)

    if subscription is not None:
        plan = get_subscription_plan(db, plan_id=subscription.plan_id)
        if plan is None:
            raise BillingSubjectNotFoundError("Subscription plan not found")
        changed = False
        if (
            _is_free_plan(plan)
            and not subscription.stripe_subscription_id
            and subscription.status == "active"
        ):
            # Free users are non-renewing and should not be considered an active paid subscription.
            subscription.status = FREE_SUBSCRIPTION_STATUS
            db.add(subscription)
            changed = True
        if wallet is None:
            wallet = CreditWallet(
                wallet_id=uuid4(),
                user_id=user_id,
                balance=plan.monthly_credits,
                monthly_credits=plan.monthly_credits,
                topup_credits=0,
            )
            db.add(wallet)
            if plan.monthly_credits > 0:
                _create_credit_transaction(
                    db,
                    user_id=user_id,
                    amount=plan.monthly_credits,
                    transaction_type=TRANSACTION_MONTHLY_GRANT,
                    reason="billing wallet backfill grant",
                )
            changed = True
        elif wallet.balance != wallet.monthly_credits + wallet.topup_credits:
            wallet.balance = wallet.monthly_credits + wallet.topup_credits
            db.add(wallet)
            changed = True
        if changed:
            db.commit()
            db.refresh(subscription)
            db.refresh(wallet)
        return subscription, wallet, plan

    plan_name = _default_plan_name(pricing_tier)
    plan = get_subscription_plan(db, name=plan_name)
    if plan is None:
        raise BillingSubjectNotFoundError("Default subscription plan not found")

    cycle_start = utcnow()
    is_free_plan = _is_free_plan(plan)
    renewal_date = cycle_start if is_free_plan else cycle_start + timedelta(days=BILLING_CYCLE_DAYS)
    subscription = UserSubscription(
        user_subscription_id=uuid4(),
        user_id=user_id,
        plan_id=plan.plan_id,
        status=FREE_SUBSCRIPTION_STATUS if is_free_plan else "active",
        start_date=cycle_start,
        renewal_date=renewal_date,
    )
    wallet = CreditWallet(
        wallet_id=uuid4(),
        user_id=user_id,
        balance=plan.monthly_credits,
        monthly_credits=plan.monthly_credits,
        topup_credits=0,
    )
    db.add_all([subscription, wallet])
    if plan.monthly_credits > 0:
        _create_credit_transaction(
            db,
            user_id=user_id,
            amount=plan.monthly_credits,
            transaction_type=TRANSACTION_MONTHLY_GRANT,
            reason="initial monthly grant",
        )
    db.commit()
    db.refresh(subscription)
    db.refresh(wallet)
    return subscription, wallet, plan


def subscribe_user(
    db: Session,
    *,
    user_id: UUID,
    plan_id: UUID,
    tenant_id: UUID | None = None,
    stripe_customer_id: str | None = None,
    stripe_subscription_id: str | None = None,
    stripe_price_id: str | None = None,
    ensure_minimum_monthly_credits: int | None = None,
    transaction_reason: str | None = None,
) -> tuple[UserSubscription, CreditWallet, SubscriptionPlan]:
    ensure_default_subscription_plans(db)
    plan = get_subscription_plan(db, plan_id=plan_id)
    if plan is None:
        raise BillingSubjectNotFoundError("Subscription plan not found")

    subscription = get_user_subscription(db, user_id=user_id)
    wallet = get_credit_wallet(db, user_id=user_id)
    if subscription is None and wallet is None:
        cycle_start = utcnow()
        is_free_plan = _is_free_plan(plan)
        subscription = UserSubscription(
            user_subscription_id=uuid4(),
            user_id=user_id,
            plan_id=plan.plan_id,
            status=FREE_SUBSCRIPTION_STATUS if is_free_plan else "active",
            start_date=cycle_start,
            renewal_date=(
                cycle_start if is_free_plan else cycle_start + timedelta(days=BILLING_CYCLE_DAYS)
            ),
        )
        wallet = CreditWallet(
            wallet_id=uuid4(),
            user_id=user_id,
            balance=plan.monthly_credits,
            monthly_credits=plan.monthly_credits,
            topup_credits=0,
        )
        db.add_all([subscription, wallet])
        if plan.monthly_credits > 0:
            _create_credit_transaction(
                db,
                user_id=user_id,
                amount=plan.monthly_credits,
                transaction_type=TRANSACTION_MONTHLY_GRANT,
                reason="initial monthly grant",
            )
        db.flush()
    elif subscription is None or wallet is None:
        subscription, wallet, _ = ensure_user_billing(db, user_id=user_id)

    subscription.plan_id = plan.plan_id
    subscription.status = FREE_SUBSCRIPTION_STATUS if _is_free_plan(plan) else "active"
    if stripe_customer_id is not None:
        subscription.stripe_customer_id = stripe_customer_id
    if stripe_subscription_id is not None:
        subscription.stripe_subscription_id = stripe_subscription_id
    if stripe_price_id is not None:
        subscription.stripe_price_id = stripe_price_id
    db.add(subscription)

    if (
        ensure_minimum_monthly_credits is not None
        and wallet.monthly_credits < ensure_minimum_monthly_credits
    ):
        grant_amount = ensure_minimum_monthly_credits - wallet.monthly_credits
        wallet.monthly_credits = ensure_minimum_monthly_credits
        wallet.balance = wallet.monthly_credits + wallet.topup_credits
        db.add(wallet)
        _create_credit_transaction(
            db,
            user_id=user_id,
            amount=grant_amount,
            transaction_type=TRANSACTION_MONTHLY_GRANT,
            reason=transaction_reason or f"subscription change grant ({plan.name})",
        )

    if tenant_id is not None:
        tenant = db.scalar(select(Tenant).where(Tenant.tenant_id == tenant_id))
        if isinstance(tenant, Tenant):
            tenant.pricing_tier = _workspace_tier_for_plan(plan)
            db.add(tenant)

    db.commit()
    db.refresh(subscription)
    db.refresh(wallet)
    return subscription, wallet, plan


def topup_credits(
    db: Session,
    *,
    user_id: UUID,
    credits: int,
    pricing_tier: str | None = None,
    reason: str | None = None,
) -> CreditWallet:
    if credits <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Credits must be greater than zero",
        )

    subscription, wallet, _ = ensure_user_billing(db, user_id=user_id, pricing_tier=pricing_tier)
    _ = subscription

    wallet.topup_credits += credits
    wallet.balance = wallet.monthly_credits + wallet.topup_credits
    db.add(wallet)
    _create_credit_transaction(
        db,
        user_id=user_id,
        amount=credits,
        transaction_type=TRANSACTION_TOPUP_PURCHASE,
        reason=reason or f"top-up purchase ({credits} credits)",
    )
    db.commit()
    db.refresh(wallet)
    return wallet


def apply_subscription_cycle_grant(
    db: Session,
    *,
    subscription: UserSubscription,
    plan: SubscriptionPlan,
    renewal_date: datetime,
    reason: str,
) -> tuple[UserSubscription, CreditWallet]:
    wallet = get_credit_wallet(db, user_id=subscription.user_id)
    if wallet is None:
        wallet = CreditWallet(
            wallet_id=uuid4(),
            user_id=subscription.user_id,
            balance=0,
            monthly_credits=0,
            topup_credits=0,
        )
        db.add(wallet)
        db.flush()

    subscription.plan_id = plan.plan_id
    subscription.status = "active"
    subscription.renewal_date = renewal_date
    wallet.monthly_credits += plan.monthly_credits
    wallet.balance = wallet.monthly_credits + wallet.topup_credits
    db.add_all([subscription, wallet])
    if plan.monthly_credits > 0:
        _create_credit_transaction(
            db,
            user_id=subscription.user_id,
            amount=plan.monthly_credits,
            transaction_type=TRANSACTION_MONTHLY_GRANT,
            reason=reason,
        )
    db.commit()
    db.refresh(subscription)
    db.refresh(wallet)
    return subscription, wallet


def cancel_user_subscription(
    db: Session,
    *,
    subscription: UserSubscription,
    tenant_id: UUID | None = None,
) -> tuple[UserSubscription, SubscriptionPlan]:
    free_plan = get_subscription_plan(db, plan_id=FREE_PLAN_ID)
    if free_plan is None:
        raise BillingSubjectNotFoundError("Free subscription plan not found")

    subscription.plan_id = free_plan.plan_id
    subscription.status = "canceled"
    subscription.stripe_subscription_id = None
    subscription.stripe_price_id = None
    db.add(subscription)

    if tenant_id is not None:
        tenant = db.scalar(select(Tenant).where(Tenant.tenant_id == tenant_id))
        if isinstance(tenant, Tenant):
            tenant.pricing_tier = _workspace_tier_for_plan(free_plan)
            db.add(tenant)

    db.commit()
    db.refresh(subscription)
    return subscription, free_plan


def consume_credits(
    db: Session,
    *,
    user_id: UUID,
    amount: int,
    reason: str,
    pricing_tier: str | None = None,
) -> CreditWallet:
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Credit amount must be greater than zero",
        )

    _, wallet, _ = ensure_user_billing(db, user_id=user_id, pricing_tier=pricing_tier)
    if wallet.balance < amount:
        raise InsufficientCreditsError("Insufficient credits")

    remaining = amount
    from_monthly = min(wallet.monthly_credits, remaining)
    wallet.monthly_credits -= from_monthly
    remaining -= from_monthly
    if remaining > 0:
        wallet.topup_credits -= remaining
    wallet.balance = wallet.monthly_credits + wallet.topup_credits
    db.add(wallet)
    _create_credit_transaction(
        db,
        user_id=user_id,
        amount=-amount,
        transaction_type=TRANSACTION_USAGE,
        reason=reason,
    )
    db.commit()
    db.refresh(wallet)
    return wallet


def grant_due_monthly_credits(
    db: Session,
    *,
    now: datetime | None = None,
) -> dict[str, int]:
    ensure_default_subscription_plans(db)
    effective_now = now or utcnow()
    grants_processed = 0
    credits_granted = 0

    subscriptions = list(
        db.scalars(select(UserSubscription).where(UserSubscription.status == "active"))
    )
    plan_map = {plan.plan_id: plan for plan in list_subscription_plans(db)}

    for subscription in subscriptions:
        if subscription.stripe_subscription_id:
            continue
        renewal_date = subscription.renewal_date
        if renewal_date.tzinfo is None:
            renewal_date = renewal_date.replace(tzinfo=UTC)
            subscription.renewal_date = renewal_date
        if subscription.renewal_date > effective_now:
            continue

        plan = plan_map.get(subscription.plan_id)
        if plan is None:
            continue
        if plan.monthly_credits <= 0:
            continue

        wallet = get_credit_wallet(db, user_id=subscription.user_id)
        if wallet is None:
            wallet = CreditWallet(
                wallet_id=uuid4(),
                user_id=subscription.user_id,
                balance=0,
                monthly_credits=0,
                topup_credits=0,
            )
            db.add(wallet)
            db.flush()

        cycles = 0
        while subscription.renewal_date <= effective_now:
            cycles += 1
            subscription.renewal_date = subscription.renewal_date + timedelta(
                days=BILLING_CYCLE_DAYS
            )

        if cycles <= 0:
            continue

        grant_amount = cycles * plan.monthly_credits
        wallet.monthly_credits += grant_amount
        wallet.balance = wallet.monthly_credits + wallet.topup_credits
        db.add_all([subscription, wallet])
        _create_credit_transaction(
            db,
            user_id=subscription.user_id,
            amount=grant_amount,
            transaction_type=TRANSACTION_MONTHLY_GRANT,
            reason=f"monthly billing cycle grant x{cycles}",
        )
        grants_processed += 1
        credits_granted += grant_amount

    db.commit()
    return {
        "subscriptions_updated": grants_processed,
        "credits_granted": credits_granted,
    }


def resolve_billable_user_id(
    db: Session,
    *,
    tenant_auth: TenantAuthContext,
    project_id: UUID,
) -> UUID | None:
    if tenant_auth.is_demo:
        return None
    if tenant_auth.user_id is not None:
        return tenant_auth.user_id

    project = db.scalar(select(Project).where(Project.project_id == project_id))
    if isinstance(project, Project) and project.owner_id is not None:
        return project.owner_id
    return None


def get_queue_priority_for_user(
    db: Session, *, user_id: UUID, pricing_tier: str | None = None
) -> str:
    subscription, _, plan = ensure_user_billing(db, user_id=user_id, pricing_tier=pricing_tier)
    _ = subscription
    return _queue_priority_for_plan(plan)


def get_queue_priority_for_context(
    db: Session,
    *,
    tenant_auth: TenantAuthContext,
    project_id: UUID,
) -> str:
    billable_user_id = resolve_billable_user_id(
        db,
        tenant_auth=tenant_auth,
        project_id=project_id,
    )
    if billable_user_id is None:
        return QUEUE_NORMAL
    return get_queue_priority_for_user(
        db,
        user_id=billable_user_id,
        pricing_tier=_pricing_tier_for_project(db, project_id=project_id),
    )


def operation_cost_for_campaign(*, attempt_count: int) -> tuple[int, str]:
    if attempt_count >= LARGE_CAMPAIGN_ATTEMPT_THRESHOLD:
        return LARGE_CAMPAIGN_CREDIT_COST, "large_campaign"
    return MUTATION_CAMPAIGN_CREDIT_COST, "mutation_campaign"


def operation_cost_for_template_replay() -> tuple[int, str]:
    return TRACE_REPLAY_CREDIT_COST, "trace_replay"


def operation_cost_for_pack_run(*, mutation_pack: Any) -> tuple[int, str]:
    cost = int(getattr(mutation_pack, "credit_cost", 20))
    pack_name = str(getattr(mutation_pack, "name", "unknown"))
    return cost, f"pack_run:{pack_name}"


def operation_cost_for_campaign_record(campaign: Any) -> tuple[int, str]:
    attempt_count = _attempt_count_from_eval_set(getattr(campaign, "eval_set", None))
    return operation_cost_for_campaign(attempt_count=attempt_count)


def _attempt_count_from_eval_set(eval_set: Any) -> int:
    if isinstance(eval_set, dict):
        value = eval_set.get("attempts_count")
        if isinstance(value, int) and value > 0:
            return value
    return 1


def maybe_consume_credits_for_campaign_run(
    db: Session,
    *,
    tenant_auth: TenantAuthContext,
    project_id: UUID,
    campaign: Any,
) -> CreditWallet | None:
    billable_user_id = resolve_billable_user_id(
        db,
        tenant_auth=tenant_auth,
        project_id=project_id,
    )
    if billable_user_id is None:
        return None
    pricing_tier = _pricing_tier_for_project(db, project_id=project_id)
    cost, reason = operation_cost_for_campaign_record(campaign)
    return consume_credits(
        db,
        user_id=billable_user_id,
        amount=cost,
        reason=reason,
        pricing_tier=pricing_tier,
    )


def consume_credits_for_pack_run(
    db: Session,
    *,
    tenant_auth: TenantAuthContext,
    project_id: UUID,
    mutation_pack: Any,
) -> CreditWallet | None:
    billable_user_id = resolve_billable_user_id(
        db,
        tenant_auth=tenant_auth,
        project_id=project_id,
    )
    if billable_user_id is None:
        return None
    pricing_tier = _pricing_tier_for_project(db, project_id=project_id)
    credit_cost, reason = operation_cost_for_pack_run(mutation_pack=mutation_pack)
    return consume_credits(
        db,
        user_id=billable_user_id,
        amount=credit_cost,
        reason=reason,
        pricing_tier=pricing_tier,
    )


def consume_credits_for_project_campaign(
    db: Session,
    *,
    project_id: UUID,
    campaign: Any,
) -> CreditWallet | None:
    """Consume credits for a campaign run triggered without a TenantAuthContext (e.g. CI gate).

    Resolves the billable user from the project's owner_id.  Returns None if the
    project has no owner (demo or unowned project) so the run proceeds free of charge.
    Raises InsufficientCreditsError when the owner exists but lacks credits.
    """
    project = db.scalar(select(Project).where(Project.project_id == project_id))
    if not isinstance(project, Project) or project.owner_id is None:
        return None
    pricing_tier = _pricing_tier_for_project(db, project_id=project_id)
    cost, reason = operation_cost_for_campaign_record(campaign)
    return consume_credits(
        db,
        user_id=project.owner_id,
        amount=cost,
        reason=reason,
        pricing_tier=pricing_tier,
    )


def maybe_consume_credits_for_trace_replay(
    db: Session,
    *,
    tenant_auth: TenantAuthContext,
    project_id: UUID,
) -> CreditWallet | None:
    billable_user_id = resolve_billable_user_id(
        db,
        tenant_auth=tenant_auth,
        project_id=project_id,
    )
    if billable_user_id is None:
        return None
    pricing_tier = _pricing_tier_for_project(db, project_id=project_id)
    cost, reason = operation_cost_for_template_replay()
    return consume_credits(
        db,
        user_id=billable_user_id,
        amount=cost,
        reason=reason,
        pricing_tier=pricing_tier,
    )


def refund_credits_for_context(
    db: Session,
    *,
    tenant_auth: TenantAuthContext,
    project_id: UUID,
    amount: int,
    reason: str,
) -> CreditWallet | None:
    billable_user_id = resolve_billable_user_id(
        db,
        tenant_auth=tenant_auth,
        project_id=project_id,
    )
    if billable_user_id is None:
        return None
    pricing_tier = _pricing_tier_for_project(db, project_id=project_id)
    return refund_credits(
        db,
        user_id=billable_user_id,
        amount=amount,
        reason=reason,
        pricing_tier=pricing_tier,
    )


def refund_credits_for_project_owner(
    db: Session,
    *,
    project_id: UUID,
    amount: int,
    reason: str,
) -> CreditWallet | None:
    project = db.scalar(select(Project).where(Project.project_id == project_id))
    if not isinstance(project, Project) or project.owner_id is None:
        return None
    pricing_tier = _pricing_tier_for_project(db, project_id=project_id)
    return refund_credits(
        db,
        user_id=project.owner_id,
        amount=amount,
        reason=reason,
        pricing_tier=pricing_tier,
    )


def serialize_subscription_plan(plan: SubscriptionPlan) -> dict[str, Any]:
    return {
        "plan_id": plan.plan_id,
        "name": plan.name,
        "monthly_price": plan.monthly_price,
        "monthly_credits": plan.monthly_credits,
        "checkout_enabled": self_serve_checkout_enabled_for_plan(plan),
        "features": plan.features,
        "created_at": plan.created_at,
    }


def serialize_credit_wallet(
    wallet: CreditWallet,
    *,
    plan: SubscriptionPlan | None = None,
) -> dict[str, Any]:
    queue_priority = _queue_priority_for_plan(plan)
    return {
        "wallet_id": wallet.wallet_id,
        "balance": wallet.balance,
        "monthly_credits": wallet.monthly_credits,
        "topup_credits": wallet.topup_credits,
        "queue_priority": queue_priority,
        "low_credit_threshold": LOW_CREDIT_THRESHOLD,
        "is_low_credit": wallet.balance < LOW_CREDIT_THRESHOLD,
        "updated_at": wallet.updated_at,
    }


def serialize_user_subscription(
    subscription: UserSubscription,
    *,
    plan: SubscriptionPlan | None = None,
) -> dict[str, Any]:
    resolved_plan = plan
    queue_priority = _queue_priority_for_plan(resolved_plan)
    return {
        "subscription_id": subscription.user_subscription_id,
        "plan_id": subscription.plan_id,
        "plan_name": resolved_plan.name if isinstance(resolved_plan, SubscriptionPlan) else None,
        "monthly_price": (
            resolved_plan.monthly_price if isinstance(resolved_plan, SubscriptionPlan) else None
        ),
        "monthly_credits": (
            resolved_plan.monthly_credits if isinstance(resolved_plan, SubscriptionPlan) else None
        ),
        "queue_priority": queue_priority,
        "status": subscription.status,
        "billing_provider": STRIPE_PROVIDER if subscription.stripe_customer_id else None,
        "portal_available": bool(subscription.stripe_customer_id),
        "start_date": subscription.start_date,
        "renewal_date": subscription.renewal_date,
    }


def get_billing_snapshot_for_user(
    db: Session,
    *,
    user_id: UUID,
    pricing_tier: str | None = None,
) -> dict[str, Any]:
    subscription, wallet, plan = ensure_user_billing(
        db,
        user_id=user_id,
        pricing_tier=pricing_tier,
    )
    return {
        "subscription": serialize_user_subscription(subscription, plan=plan),
        "wallet": serialize_credit_wallet(wallet, plan=plan),
        "plan": serialize_subscription_plan(plan),
    }


def get_billing_snapshot_for_context(
    db: Session,
    *,
    tenant_auth: TenantAuthContext,
    project_id: UUID,
    pricing_tier: str | None = None,
) -> dict[str, Any] | None:
    billable_user_id = resolve_billable_user_id(
        db,
        tenant_auth=tenant_auth,
        project_id=project_id,
    )
    if billable_user_id is None:
        return None
    resolved_pricing_tier = pricing_tier or _pricing_tier_for_project(db, project_id=project_id)
    return get_billing_snapshot_for_user(
        db,
        user_id=billable_user_id,
        pricing_tier=resolved_pricing_tier,
    )


def list_credit_transactions_for_user(
    db: Session,
    *,
    user_id: UUID,
    limit: int = 50,
) -> list[CreditTransaction]:
    return list(
        db.scalars(
            select(CreditTransaction)
            .where(CreditTransaction.user_id == user_id)
            .order_by(
                CreditTransaction.created_at.desc(),
                CreditTransaction.credit_transaction_id.desc(),
            )
            .limit(limit)
        )
    )


def serialize_credit_transaction(record: CreditTransaction) -> dict[str, Any]:
    return {
        "transaction_id": record.credit_transaction_id,
        "user_id": record.user_id,
        "amount": record.amount,
        "type": record.type,
        "reason": record.reason,
        "created_at": record.created_at,
    }


def ensure_billing_for_login_user(
    db: Session,
    *,
    user: User,
    tenant: Tenant | None,
) -> dict[str, Any]:
    pricing_tier = tenant.pricing_tier if isinstance(tenant, Tenant) else DEFAULT_PRICING_TIER
    return get_billing_snapshot_for_user(db, user_id=user.user_id, pricing_tier=pricing_tier)


def can_manage_billing(role_name: str) -> bool:
    return role_name == "admin"
