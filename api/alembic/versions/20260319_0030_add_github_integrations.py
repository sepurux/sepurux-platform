"""add github_integrations table

Revision ID: 20260319_0030
Revises: 20260316_0029
Create Date: 2026-03-19 00:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260319_0030"
down_revision: str | None = "20260316_0029"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "github_integrations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("repo", sa.Text(), nullable=False),
        sa.Column("installation_id", sa.Integer(), nullable=True),
        sa.Column("access_token", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_github_integrations_user_repo",
        "github_integrations",
        ["user_id", "repo"],
    )


def downgrade() -> None:
    op.drop_index("ix_github_integrations_user_repo", table_name="github_integrations")
    op.drop_table("github_integrations")
