"""add internal feature flags

Revision ID: 20260319_0033
Revises: 20260319_0032
Create Date: 2026-03-19 02:15:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260319_0033"
down_revision: str | None = "20260319_0032"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    feature_flags = op.create_table(
        "internal_feature_flags",
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column(
            "enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("key"),
    )
    op.bulk_insert(
        feature_flags,
        [
            {"key": "enable_ci", "enabled": True},
            {"key": "enable_mutations", "enabled": True},
            {"key": "enable_billing", "enabled": True},
        ],
    )


def downgrade() -> None:
    op.drop_table("internal_feature_flags")
