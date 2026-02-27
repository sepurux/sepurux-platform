"""add policy packs and policy events

Revision ID: 20260227_0009
Revises: 20260227_0008
Create Date: 2026-02-27 00:00:09.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260227_0009"
down_revision: str | None = "20260227_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

JSONB_COMPAT = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "policy_packs",
        sa.Column("policy_pack_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("version", sa.Text(), nullable=False),
        sa.Column("policy", JSONB_COMPAT, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.project_id"]),
        sa.PrimaryKeyConstraint("policy_pack_id"),
    )
    op.create_index("ix_policy_packs_project_id", "policy_packs", ["project_id"])

    op.add_column("runs", sa.Column("policy_pack_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_runs_policy_pack_id",
        "runs",
        "policy_packs",
        ["policy_pack_id"],
        ["policy_pack_id"],
    )
    op.create_index("ix_runs_policy_pack_id", "runs", ["policy_pack_id"])

    op.create_table(
        "policy_events",
        sa.Column("policy_event_id", sa.Uuid(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("attempt_id", sa.Uuid(), nullable=True),
        sa.Column("event_index", sa.Integer(), nullable=True),
        sa.Column("tool", sa.Text(), nullable=False),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("decision", sa.Text(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["run_id"], ["runs.run_id"]),
        sa.ForeignKeyConstraint(["attempt_id"], ["replay_attempts.attempt_id"]),
        sa.PrimaryKeyConstraint("policy_event_id"),
    )
    op.create_index("ix_policy_events_run_id", "policy_events", ["run_id"])
    op.create_index("ix_policy_events_attempt_id", "policy_events", ["attempt_id"])


def downgrade() -> None:
    op.drop_index("ix_policy_events_attempt_id", table_name="policy_events")
    op.drop_index("ix_policy_events_run_id", table_name="policy_events")
    op.drop_table("policy_events")

    op.drop_index("ix_runs_policy_pack_id", table_name="runs")
    op.drop_constraint("fk_runs_policy_pack_id", "runs", type_="foreignkey")
    op.drop_column("runs", "policy_pack_id")

    op.drop_index("ix_policy_packs_project_id", table_name="policy_packs")
    op.drop_table("policy_packs")
