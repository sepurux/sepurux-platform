"""add scheduled_campaigns table

Revision ID: 20260316_0029
Revises: 20260316_0028
Create Date: 2026-03-16 00:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260316_0029"
down_revision: str | None = "20260316_0028"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "scheduled_campaigns",
        sa.Column("scheduled_campaign_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("campaign_id", sa.Uuid(), nullable=False),
        sa.Column("mutation_pack_id", sa.Uuid(), nullable=False),
        sa.Column("cron_schedule", sa.Text(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_run_status", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.campaign_id"]),
        sa.ForeignKeyConstraint(["mutation_pack_id"], ["mutation_packs.mutation_pack_id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.project_id"]),
        sa.PrimaryKeyConstraint("scheduled_campaign_id"),
    )
    op.create_index(
        "ix_scheduled_campaigns_project_id",
        "scheduled_campaigns",
        ["project_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_scheduled_campaigns_project_id", table_name="scheduled_campaigns")
    op.drop_table("scheduled_campaigns")
