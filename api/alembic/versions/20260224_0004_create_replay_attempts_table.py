"""create replay attempts table with inspector fields

Revision ID: 20260224_0004
Revises: 20260224_0003
Create Date: 2026-02-24 00:00:04.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260224_0004"
down_revision: str | None = "20260224_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "replay_attempts",
        sa.Column("attempt_id", sa.Uuid(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("mutation_id", sa.Text(), nullable=False),
        sa.Column("result", sa.Text(), nullable=False),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("first_failure_event_index", sa.Integer(), nullable=True),
        sa.Column("first_failure_tool", sa.Text(), nullable=True),
        sa.Column("artifacts_s3_key", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["run_id"], ["runs.run_id"]),
        sa.PrimaryKeyConstraint("attempt_id"),
    )


def downgrade() -> None:
    op.drop_table("replay_attempts")
