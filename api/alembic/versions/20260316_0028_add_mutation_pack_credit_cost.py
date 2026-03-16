"""add credit_cost to mutation_packs

Revision ID: 20260316_0028
Revises: 20260315_0027
Create Date: 2026-03-16 00:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260316_0028"
down_revision: str | None = "20260315_0027"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "mutation_packs",
        sa.Column(
            "credit_cost",
            sa.Integer(),
            nullable=False,
            server_default="20",
        ),
    )


def downgrade() -> None:
    op.drop_column("mutation_packs", "credit_cost")
