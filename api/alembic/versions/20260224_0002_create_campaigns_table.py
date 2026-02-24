"""create campaigns table

Revision ID: 20260224_0002
Revises: 20260224_0001
Create Date: 2026-02-24 00:00:02.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260224_0002"
down_revision: str | None = "20260224_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "campaigns",
        sa.Column("campaign_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("mutation_set", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("eval_set", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("campaign_id"),
    )


def downgrade() -> None:
    op.drop_table("campaigns")
