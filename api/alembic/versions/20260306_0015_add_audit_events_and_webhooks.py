"""add audit events and project webhooks

Revision ID: 20260306_0015
Revises: 20260304_0014
Create Date: 2026-03-06 13:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260306_0015"
down_revision: str | None = "20260304_0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

JSONB_COMPAT = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "audit_events",
        sa.Column("audit_event_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("actor", sa.Text(), nullable=True),
        sa.Column("metadata", JSONB_COMPAT, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.project_id"]),
        sa.PrimaryKeyConstraint("audit_event_id"),
    )
    op.create_index(
        "ix_audit_events_project_id",
        "audit_events",
        ["project_id"],
    )
    op.create_index(
        "ix_audit_events_event_type",
        "audit_events",
        ["event_type"],
    )
    op.create_index(
        "ix_audit_events_created_at",
        "audit_events",
        ["created_at"],
    )

    op.create_table(
        "webhooks",
        sa.Column("webhook_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("secret", sa.Text(), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("events", JSONB_COMPAT, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("last_success_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["projects.project_id"]),
        sa.PrimaryKeyConstraint("webhook_id"),
    )
    op.create_index(
        "ix_webhooks_project_id",
        "webhooks",
        ["project_id"],
    )
    op.create_index(
        "ix_webhooks_is_enabled",
        "webhooks",
        ["is_enabled"],
    )


def downgrade() -> None:
    op.drop_index("ix_webhooks_is_enabled", table_name="webhooks")
    op.drop_index("ix_webhooks_project_id", table_name="webhooks")
    op.drop_table("webhooks")

    op.drop_index("ix_audit_events_created_at", table_name="audit_events")
    op.drop_index("ix_audit_events_event_type", table_name="audit_events")
    op.drop_index("ix_audit_events_project_id", table_name="audit_events")
    op.drop_table("audit_events")
