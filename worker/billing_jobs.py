from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy import select

from db import get_session
from models import CreditTransaction, CreditWallet, SubscriptionPlan, UserSubscription

logger = logging.getLogger(__name__)

BILLING_CYCLE_DAYS = 30


def monthly_credit_grant() -> dict[str, int]:
    effective_now = datetime.now(UTC)
    subscriptions_updated = 0
    credits_granted = 0

    with get_session() as db:
        subscriptions = list(
            db.scalars(
                select(UserSubscription).where(UserSubscription.status == "active")
            )
        )
        plans = {
            plan.plan_id: plan for plan in db.scalars(select(SubscriptionPlan)).all()
        }

        for subscription in subscriptions:
            if subscription.renewal_date > effective_now:
                continue

            plan = plans.get(subscription.plan_id)
            if plan is None:
                continue

            wallet = db.scalar(select(CreditWallet).where(CreditWallet.user_id == subscription.user_id))
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
                subscription.renewal_date = subscription.renewal_date + timedelta(days=BILLING_CYCLE_DAYS)

            if cycles <= 0:
                continue

            grant_amount = cycles * plan.monthly_credits
            wallet.monthly_credits += grant_amount
            wallet.balance = wallet.monthly_credits + wallet.topup_credits
            db.add_all([subscription, wallet])
            db.add(
                CreditTransaction(
                    credit_transaction_id=uuid4(),
                    user_id=subscription.user_id,
                    amount=grant_amount,
                    type="monthly_grant",
                    reason=f"monthly billing cycle grant x{cycles}",
                )
            )
            subscriptions_updated += 1
            credits_granted += grant_amount

        db.commit()

    logger.info(
        "Monthly credit grant completed: subscriptions_updated=%s credits_granted=%s",
        subscriptions_updated,
        credits_granted,
    )
    return {
        "subscriptions_updated": subscriptions_updated,
        "credits_granted": credits_granted,
    }
