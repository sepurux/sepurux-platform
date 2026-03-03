"""add policy pack engine and policy event input

Revision ID: 20260302_0011
Revises: 20260227_0010
Create Date: 2026-03-02 00:00:11.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260302_0011"
down_revision: str | None = "20260227_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

JSONB_COMPAT = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.add_column(
        "policy_packs",
        sa.Column(
            "engine",
            sa.Text(),
            nullable=False,
            server_default="builtin",
        ),
    )
    op.add_column("policy_events", sa.Column("input", JSONB_COMPAT, nullable=True))
    op.drop_column("policy_packs", "version")


def downgrade() -> None:
    op.add_column(
        "policy_packs",
        sa.Column(
            "version",
            sa.Text(),
            nullable=False,
            server_default="0.1.0",
        ),
    )
    op.drop_column("policy_events", "input")
    op.drop_column("policy_packs", "engine")
