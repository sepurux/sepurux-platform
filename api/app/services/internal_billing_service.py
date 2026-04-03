from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.models import CreditTransaction, CreditWallet, Project, SubscriptionPlan, Tenant, User, UserSubscription
from app.schemas import (
    InternalBillingAdjustmentResponse,
    InternalBillingSubscriptionUpdateResponse,
    InternalBillingTransactionEntry,
    InternalBillingWalletEntry,
)
from app.services.billing_service import (
    BILLING_CYCLE_DAYS,
    FREE_SUBSCRIPTION_STATUS,
    ensure_default_subscription_plans,
    ensure_user_billing,
    get_subscription_plan,
    serialize_user_subscription,
)
from sqlalchemy import select
from sqlalchemy.orm import Session
from datetime import timedelta


def _wallet_entry(
    wallet: CreditWallet,
    user: User | None,
    *,
    plan: SubscriptionPlan | None = None,
    subscription: UserSubscription | None = None,
    pricing_tier: str | None = None,
) -> InternalBillingWalletEntry:
    return InternalBillingWalletEntry(
        wallet_id=wallet.wallet_id,
        user_id=wallet.user_id,
        email=user.email if isinstance(user, User) else None,
        name=user.name if isinstance(user, User) else None,
        plan_id=plan.plan_id if isinstance(plan, SubscriptionPlan) else None,
        plan_name=plan.name if isinstance(plan, SubscriptionPlan) else None,
        pricing_tier=pricing_tier,
        subscription_status=subscription.status if isinstance(subscription, UserSubscription) else None,
        balance=wallet.balance,
        monthly_credits=wallet.monthly_credits,
        topup_credits=wallet.topup_credits,
        updated_at=wallet.updated_at,
    )


def _transaction_entry(
    transaction: CreditTransaction,
    user: User | None,
) -> InternalBillingTransactionEntry:
    return InternalBillingTransactionEntry(
        credit_transaction_id=transaction.credit_transaction_id,
        user_id=transaction.user_id,
        email=user.email if isinstance(user, User) else None,
        amount=transaction.amount,
        type=transaction.type,
        reason=transaction.reason,
        created_at=transaction.created_at,
    )


def list_internal_wallets(
    db: Session,
    *,
    limit: int = 200,
    offset: int = 0,
) -> list[InternalBillingWalletEntry]:
    rows = db.execute(
        select(CreditWallet, User)
        .outerjoin(User, User.user_id == CreditWallet.user_id)
        .order_by(CreditWallet.updated_at.desc(), CreditWallet.user_id.asc())
        .offset(offset)
        .limit(limit)
    ).all()
    user_ids = [wallet.user_id for wallet, _ in rows]
    if not user_ids:
        return []

    subscriptions = {
        record.user_id: record
        for record in db.scalars(
            select(UserSubscription).where(UserSubscription.user_id.in_(user_ids))
        ).all()
    }
    plan_ids = [record.plan_id for record in subscriptions.values()]
    plans = {
        record.plan_id: record
        for record in db.scalars(
            select(SubscriptionPlan).where(SubscriptionPlan.plan_id.in_(plan_ids))
        ).all()
    }
    tenant_rows = db.execute(
        select(Project.owner_id, Tenant.pricing_tier)
        .join(Tenant, Tenant.tenant_id == Project.tenant_id)
        .where(Project.owner_id.in_(user_ids))
        .order_by(Project.created_at.asc())
    ).all()
    pricing_tier_by_user: dict[UUID, str] = {}
    for owner_id, pricing_tier in tenant_rows:
        if owner_id not in pricing_tier_by_user and isinstance(pricing_tier, str):
            pricing_tier_by_user[owner_id] = pricing_tier

    return [
        _wallet_entry(
            wallet,
            user,
            plan=plans.get(subscriptions[wallet.user_id].plan_id)
            if wallet.user_id in subscriptions
            else None,
            subscription=subscriptions.get(wallet.user_id),
            pricing_tier=pricing_tier_by_user.get(wallet.user_id),
        )
        for wallet, user in rows
    ]


def list_internal_transactions(
    db: Session,
    *,
    limit: int = 200,
    offset: int = 0,
) -> list[InternalBillingTransactionEntry]:
    rows = db.execute(
        select(CreditTransaction, User)
        .outerjoin(User, User.user_id == CreditTransaction.user_id)
        .order_by(
            CreditTransaction.created_at.desc(), CreditTransaction.credit_transaction_id.desc()
        )
        .offset(offset)
        .limit(limit)
    ).all()
    return [_transaction_entry(transaction, user) for transaction, user in rows]


def adjust_internal_credits(
    db: Session,
    *,
    user_id: UUID,
    amount: int,
    reason: str,
) -> InternalBillingAdjustmentResponse:
    user = db.scalar(select(User).where(User.user_id == user_id))
    if not isinstance(user, User):
        raise ValueError("User not found")

    wallet = db.scalar(select(CreditWallet).where(CreditWallet.user_id == user_id))
    if not isinstance(wallet, CreditWallet):
        wallet = CreditWallet(
            wallet_id=uuid4(),
            user_id=user_id,
            balance=0,
            monthly_credits=0,
            topup_credits=0,
        )
        db.add(wallet)
        db.flush()

    if amount < 0 and wallet.balance + amount < 0:
        raise ValueError("Adjustment would make wallet balance negative")

    wallet.balance = int(wallet.balance) + int(amount)
    wallet.topup_credits = max(int(wallet.topup_credits) + int(amount), 0)
    wallet.updated_at = datetime.now(UTC)

    transaction = CreditTransaction(
        credit_transaction_id=uuid4(),
        user_id=user_id,
        amount=amount,
        type="manual_adjustment",
        reason=reason,
        created_at=datetime.now(UTC),
    )
    db.add(wallet)
    db.add(transaction)
    db.commit()
    db.refresh(wallet)
    db.refresh(transaction)

    return InternalBillingAdjustmentResponse(
        wallet=_wallet_entry(wallet, user),
        transaction=_transaction_entry(transaction, user),
    )


def change_internal_user_subscription(
    db: Session,
    *,
    user_id: UUID,
    plan_id: UUID,
    reason: str,
) -> InternalBillingSubscriptionUpdateResponse:
    ensure_default_subscription_plans(db)
    user = db.scalar(select(User).where(User.user_id == user_id))
    if not isinstance(user, User):
        raise ValueError("User not found")

    target_plan = get_subscription_plan(db, plan_id=plan_id)
    if not isinstance(target_plan, SubscriptionPlan):
        raise ValueError("Subscription plan not found")

    subscription, wallet, previous_plan = ensure_user_billing(db, user_id=user_id)
    previous_balance = int(wallet.balance)
    previous_plan_name = previous_plan.name if isinstance(previous_plan, SubscriptionPlan) else "Unknown"

    now = datetime.now(UTC)
    subscription.plan_id = target_plan.plan_id
    subscription.status = (
        FREE_SUBSCRIPTION_STATUS
        if target_plan.monthly_price <= 0
        else "active"
    )
    subscription.start_date = now
    subscription.renewal_date = (
        now if target_plan.monthly_price <= 0 else now + timedelta(days=BILLING_CYCLE_DAYS)
    )

    wallet.monthly_credits = int(target_plan.monthly_credits)
    wallet.balance = int(wallet.monthly_credits) + int(wallet.topup_credits)
    wallet.updated_at = now

    db.add(subscription)
    db.add(wallet)

    tenant_id = db.scalar(
        select(Project.tenant_id)
        .where(Project.owner_id == user_id)
        .order_by(Project.created_at.asc())
        .limit(1)
    )
    if tenant_id is not None:
        tenant = db.scalar(select(Tenant).where(Tenant.tenant_id == tenant_id))
        workspace_tier = (
            target_plan.features.get("workspace_tier")
            if isinstance(target_plan.features, dict)
            else None
        )
        if isinstance(tenant, Tenant) and isinstance(workspace_tier, str):
            tenant.pricing_tier = workspace_tier
            db.add(tenant)

    balance_delta = int(wallet.balance) - previous_balance
    if balance_delta != 0:
        db.add(
            CreditTransaction(
                credit_transaction_id=uuid4(),
                user_id=user_id,
                amount=balance_delta,
                type="manual_plan_change",
                reason=(
                    f"{reason} ({previous_plan_name} -> {target_plan.name})"
                ),
                created_at=now,
            )
        )

    db.commit()
    db.refresh(subscription)
    db.refresh(wallet)

    refreshed_tier = None
    if tenant_id is not None:
        tenant = db.scalar(select(Tenant).where(Tenant.tenant_id == tenant_id))
        refreshed_tier = tenant.pricing_tier if isinstance(tenant, Tenant) else None

    return InternalBillingSubscriptionUpdateResponse(
        wallet=_wallet_entry(
            wallet,
            user,
            plan=target_plan,
            subscription=subscription,
            pricing_tier=refreshed_tier,
        ),
        subscription=serialize_user_subscription(subscription, plan=target_plan),
    )
