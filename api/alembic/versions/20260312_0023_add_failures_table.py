"""add failures table

Revision ID: 20260312_0023
Revises: 20260311_0022
Create Date: 2026-03-12 23:40:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260312_0023"
down_revision: str | None = "20260311_0022"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "failures",
        sa.Column("failure_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("campaign_id", sa.Uuid(), nullable=False),
        sa.Column("trace_id", sa.Uuid(), nullable=False),
        sa.Column("mutation_name", sa.Text(), nullable=False),
        sa.Column("failure_type", sa.Text(), nullable=False),
        sa.Column("severity", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.campaign_id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.project_id"]),
        sa.ForeignKeyConstraint(["run_id"], ["runs.run_id"]),
        sa.ForeignKeyConstraint(["trace_id"], ["traces.trace_id"]),
        sa.PrimaryKeyConstraint("failure_id"),
    )
    op.create_index("ix_failures_project_campaign", "failures", ["project_id", "campaign_id"])
    op.create_index("ix_failures_project_run", "failures", ["project_id", "run_id"])
    op.create_index("ix_failures_failure_type", "failures", ["failure_type"])
    op.create_index("ix_failures_severity", "failures", ["severity"])


def downgrade() -> None:
    op.drop_index("ix_failures_severity", table_name="failures")
    op.drop_index("ix_failures_failure_type", table_name="failures")
    op.drop_index("ix_failures_project_run", table_name="failures")
    op.drop_index("ix_failures_project_campaign", table_name="failures")
    op.drop_table("failures")
