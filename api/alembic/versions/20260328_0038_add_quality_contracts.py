"""add quality contracts

Revision ID: 20260328_0038
Revises: 20260325_0037
Create Date: 2026-03-28 00:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260328_0038"
down_revision: str | None = "20260325_0037"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

_JSONB = sa.JSON().with_variant(sa.dialects.postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "quality_contracts",
        sa.Column("contract_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("campaign_id", sa.Uuid(), nullable=False),
        sa.Column("required_pack_ids", _JSONB, nullable=False, server_default="[]"),
        sa.Column("required_tools", _JSONB, nullable=False, server_default="[]"),
        sa.Column("min_attempts_per_pack", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.campaign_id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.project_id"]),
        sa.PrimaryKeyConstraint("contract_id"),
        sa.UniqueConstraint("campaign_id", name="uq_quality_contracts_campaign_id"),
    )
    op.create_index("ix_quality_contracts_campaign_id", "quality_contracts", ["campaign_id"])
    op.create_index("ix_quality_contracts_project_id", "quality_contracts", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_quality_contracts_project_id", table_name="quality_contracts")
    op.drop_index("ix_quality_contracts_campaign_id", table_name="quality_contracts")
    op.drop_table("quality_contracts")
