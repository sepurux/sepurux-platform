"""create counterfactuals table

Revision ID: 20260225_0005
Revises: 20260224_0004
Create Date: 2026-02-25 00:00:05.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260225_0005"
down_revision: str | None = "20260224_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "counterfactuals",
        sa.Column("counterfactual_id", sa.Uuid(), nullable=False),
        sa.Column("attempt_id", sa.Uuid(), nullable=False),
        sa.Column("strategy", sa.Text(), nullable=False),
        sa.Column("result", sa.Text(), nullable=False),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("metrics", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("diff", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["attempt_id"], ["replay_attempts.attempt_id"]),
        sa.PrimaryKeyConstraint("counterfactual_id"),
    )
    op.create_index("ix_counterfactuals_attempt_id", "counterfactuals", ["attempt_id"])
    op.create_index("ix_counterfactuals_strategy", "counterfactuals", ["strategy"])


def downgrade() -> None:
    op.drop_index("ix_counterfactuals_strategy", table_name="counterfactuals")
    op.drop_index("ix_counterfactuals_attempt_id", table_name="counterfactuals")
    op.drop_table("counterfactuals")
