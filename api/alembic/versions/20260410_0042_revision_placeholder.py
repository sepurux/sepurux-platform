"""revision placeholder

Revision ID: 20260410_0042
Revises: 20260403_0041
Create Date: 2026-04-10 23:55:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence


revision: str = "20260410_0042"
down_revision: str | None = "20260403_0041"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
