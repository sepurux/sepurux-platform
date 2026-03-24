"""add user notifications

Revision ID: 20260324_0035
Revises: 20260319_0034
Create Date: 2026-03-24 14:20:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260324_0035"
down_revision: str | None = "20260319_0034"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_notifications",
        sa.Column("notification_id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("event_type", sa.Text(), nullable=False, server_default="system"),
        sa.Column("severity", sa.Text(), nullable=False, server_default="info"),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("link_url", sa.Text(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.tenant_id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.project_id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("notification_id"),
    )
    op.create_index(
        "ix_user_notifications_scope_created_at",
        "user_notifications",
        ["tenant_id", "project_id", "created_at"],
    )
    op.create_index(
        "ix_user_notifications_user_read_at",
        "user_notifications",
        ["user_id", "read_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_user_notifications_user_read_at", table_name="user_notifications")
    op.drop_index("ix_user_notifications_scope_created_at", table_name="user_notifications")
    op.drop_table("user_notifications")
