"""add tenant pricing tier for plan-based access

Revision ID: 20260310_0021
Revises: 20260310_0020
Create Date: 2026-03-10 00:30:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260310_0021"
down_revision: str | None = "20260310_0020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "tenants",
        sa.Column(
            "pricing_tier",
            sa.Text(),
            nullable=False,
            server_default=sa.text("'team'"),
        ),
    )
    op.execute(sa.text("UPDATE tenants SET pricing_tier = 'enterprise'"))


def downgrade() -> None:
    op.drop_column("tenants", "pricing_tier")
