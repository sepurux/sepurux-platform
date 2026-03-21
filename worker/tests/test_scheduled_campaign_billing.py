from __future__ import annotations

from types import SimpleNamespace
from typing import Any, cast

import worker as worker_module


def test_consume_wallet_credits_uses_monthly_before_topup() -> None:
    wallet = cast(Any, SimpleNamespace(monthly_credits=40, topup_credits=30, balance=70))

    worker_module._consume_wallet_credits(wallet, amount=50)

    assert wallet.monthly_credits == 0
    assert wallet.topup_credits == 20
    assert wallet.balance == 20


def test_consume_wallet_credits_all_from_monthly_when_available() -> None:
    wallet = cast(Any, SimpleNamespace(monthly_credits=80, topup_credits=5, balance=85))

    worker_module._consume_wallet_credits(wallet, amount=20)

    assert wallet.monthly_credits == 60
    assert wallet.topup_credits == 5
    assert wallet.balance == 65
