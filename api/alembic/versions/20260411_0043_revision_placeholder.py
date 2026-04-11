"""revision placeholder

Revision ID: 20260411_0043
Revises: 20260410_0042
Create Date: 2026-04-11 09:45:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence


revision: str = "20260411_0043"
down_revision: str | None = "20260410_0042"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
