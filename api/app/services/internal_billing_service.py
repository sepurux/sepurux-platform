from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.models import CreditTransaction, CreditWallet, User
from app.schemas import (
    InternalBillingAdjustmentResponse,
    InternalBillingTransactionEntry,
    InternalBillingWalletEntry,
)
from sqlalchemy import select
from sqlalchemy.orm import Session


def _wallet_entry(wallet: CreditWallet, user: User | None) -> InternalBillingWalletEntry:
    return InternalBillingWalletEntry(
        wallet_id=wallet.wallet_id,
        user_id=wallet.user_id,
        email=user.email if isinstance(user, User) else None,
        name=user.name if isinstance(user, User) else None,
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
    return [_wallet_entry(wallet, user) for wallet, user in rows]


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
