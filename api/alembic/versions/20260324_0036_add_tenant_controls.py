"""add tenant controls

Revision ID: 20260324_0036
Revises: 20260324_0035
Create Date: 2026-03-24 23:10:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260324_0036"
down_revision: str | None = "20260324_0035"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "tenant_controls",
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("runs_paused", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "workspace_creation_locked",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("updated_by", sa.Text(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.tenant_id"]),
        sa.PrimaryKeyConstraint("tenant_id"),
    )


def downgrade() -> None:
    op.drop_table("tenant_controls")
