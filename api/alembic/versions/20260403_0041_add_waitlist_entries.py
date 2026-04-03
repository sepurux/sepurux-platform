"""add waitlist entries

Revision ID: 20260403_0041
Revises: 20260330_0040
Create Date: 2026-04-03 14:40:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260403_0041"
down_revision: str | None = "20260330_0040"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "waitlist_entries",
        sa.Column("waitlist_entry_id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("company", sa.Text(), nullable=True),
        sa.Column("source", sa.Text(), nullable=False, server_default="site"),
        sa.Column("status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("submitted_from_ip", sa.Text(), nullable=True),
        sa.Column("reviewed_by", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.PrimaryKeyConstraint("waitlist_entry_id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(
        "ix_waitlist_entries_created_at",
        "waitlist_entries",
        ["created_at"],
    )
    op.create_index(
        "ix_waitlist_entries_status",
        "waitlist_entries",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index("ix_waitlist_entries_status", table_name="waitlist_entries")
    op.drop_index("ix_waitlist_entries_created_at", table_name="waitlist_entries")
    op.drop_table("waitlist_entries")
