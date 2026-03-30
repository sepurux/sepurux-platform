"""add mutation pack archival flag

Revision ID: 20260329_0039
Revises: 20260328_0038
Create Date: 2026-03-29 12:40:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260329_0039"
down_revision: str | None = "20260328_0038"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "mutation_packs",
        sa.Column(
            "is_archived",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.create_index(
        "ix_mutation_packs_project_id_is_archived",
        "mutation_packs",
        ["project_id", "is_archived"],
    )


def downgrade() -> None:
    op.drop_index("ix_mutation_packs_project_id_is_archived", table_name="mutation_packs")
    op.drop_column("mutation_packs", "is_archived")
