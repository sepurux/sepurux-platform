"""add policy pack archival flag

Revision ID: 20260325_0037
Revises: 20260324_0036
Create Date: 2026-03-25 12:20:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260325_0037"
down_revision: str | None = "20260324_0036"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "policy_packs",
        sa.Column(
            "is_archived",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.create_index(
        "ix_policy_packs_project_id_is_archived",
        "policy_packs",
        ["project_id", "is_archived"],
    )


def downgrade() -> None:
    op.drop_index("ix_policy_packs_project_id_is_archived", table_name="policy_packs")
    op.drop_column("policy_packs", "is_archived")
