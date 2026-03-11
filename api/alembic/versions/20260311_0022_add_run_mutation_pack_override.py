"""add run mutation pack override

Revision ID: 20260311_0022
Revises: 20260310_0021
Create Date: 2026-03-11 09:20:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260311_0022"
down_revision: str | None = "20260310_0021"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("runs", sa.Column("mutation_pack_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_runs_mutation_pack_id",
        "runs",
        "mutation_packs",
        ["mutation_pack_id"],
        ["mutation_pack_id"],
    )
    op.execute(
        sa.text(
            """
            UPDATE runs
            SET mutation_pack_id = campaigns.mutation_pack_id
            FROM campaigns
            WHERE campaigns.campaign_id = runs.campaign_id
            """
        )
    )


def downgrade() -> None:
    op.drop_constraint("fk_runs_mutation_pack_id", "runs", type_="foreignkey")
    op.drop_column("runs", "mutation_pack_id")
