"""add mutation packs and attempt mutation trace

Revision ID: 20260227_0010
Revises: 20260227_0009
Create Date: 2026-02-27 00:00:10.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260227_0010"
down_revision: str | None = "20260227_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

JSONB_COMPAT = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "mutation_packs",
        sa.Column("mutation_pack_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("config", JSONB_COMPAT, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.project_id"]),
        sa.PrimaryKeyConstraint("mutation_pack_id"),
    )
    op.create_index("ix_mutation_packs_project_id", "mutation_packs", ["project_id"])

    op.add_column("campaigns", sa.Column("mutation_pack_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_campaigns_mutation_pack_id",
        "campaigns",
        "mutation_packs",
        ["mutation_pack_id"],
        ["mutation_pack_id"],
    )
    op.create_index("ix_campaigns_mutation_pack_id", "campaigns", ["mutation_pack_id"])

    op.add_column("replay_attempts", sa.Column("seed", sa.Integer(), nullable=True))
    op.add_column("replay_attempts", sa.Column("mutation_trace", JSONB_COMPAT, nullable=True))


def downgrade() -> None:
    op.drop_column("replay_attempts", "mutation_trace")
    op.drop_column("replay_attempts", "seed")

    op.drop_index("ix_campaigns_mutation_pack_id", table_name="campaigns")
    op.drop_constraint("fk_campaigns_mutation_pack_id", "campaigns", type_="foreignkey")
    op.drop_column("campaigns", "mutation_pack_id")

    op.drop_index("ix_mutation_packs_project_id", table_name="mutation_packs")
    op.drop_table("mutation_packs")
