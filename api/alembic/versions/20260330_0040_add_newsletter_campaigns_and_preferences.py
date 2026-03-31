"""add newsletter campaigns and preferences

Revision ID: 20260330_0040
Revises: 20260329_0039
Create Date: 2026-03-30 13:05:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260330_0040"
down_revision: str | None = "20260329_0039"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "marketing_emails_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.add_column(
        "users",
        sa.Column("marketing_unsubscribed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "newsletter_campaigns",
        sa.Column("newsletter_campaign_id", sa.Uuid(), nullable=False),
        sa.Column(
            "audience",
            sa.Text(),
            nullable=False,
            server_default="subscribed_users",
        ),
        sa.Column("subject", sa.Text(), nullable=False),
        sa.Column("preview_text", sa.Text(), nullable=True),
        sa.Column("eyebrow", sa.Text(), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("cta_label", sa.Text(), nullable=True),
        sa.Column("cta_url", sa.Text(), nullable=True),
        sa.Column("sent_by", sa.Text(), nullable=False),
        sa.Column("recipients_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("delivered_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("newsletter_campaign_id"),
    )
    op.create_index(
        "ix_newsletter_campaigns_created_at",
        "newsletter_campaigns",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_newsletter_campaigns_created_at", table_name="newsletter_campaigns")
    op.drop_table("newsletter_campaigns")
    op.drop_column("users", "marketing_unsubscribed_at")
    op.drop_column("users", "marketing_emails_enabled")
