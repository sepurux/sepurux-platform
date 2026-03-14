"""add trace steps table

Revision ID: 20260314_0024
Revises: 20260312_0023
Create Date: 2026-03-14 12:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260314_0024"
down_revision: str | None = "20260312_0023"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "trace_steps",
        sa.Column("trace_step_id", sa.Uuid(), nullable=False),
        sa.Column("trace_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("step_type", sa.Text(), nullable=False),
        sa.Column("step_name", sa.Text(), nullable=False),
        sa.Column("mutation_name", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("input_payload", sa.JSON(), nullable=True),
        sa.Column("output_payload", sa.JSON(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["projects.project_id"]),
        sa.ForeignKeyConstraint(["trace_id"], ["traces.trace_id"]),
        sa.PrimaryKeyConstraint("trace_step_id"),
    )
    op.create_index(
        "ix_trace_steps_project_trace_started_at",
        "trace_steps",
        ["project_id", "trace_id", "started_at"],
    )
    op.create_index("ix_trace_steps_trace_id", "trace_steps", ["trace_id"])


def downgrade() -> None:
    op.drop_index("ix_trace_steps_trace_id", table_name="trace_steps")
    op.drop_index("ix_trace_steps_project_trace_started_at", table_name="trace_steps")
    op.drop_table("trace_steps")
