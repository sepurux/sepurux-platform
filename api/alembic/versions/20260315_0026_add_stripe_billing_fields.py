"""add stripe billing fields

Revision ID: 20260315_0026
Revises: 20260315_0025
Create Date: 2026-03-15 13:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260315_0026"
down_revision: str | None = "20260315_0025"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "user_subscriptions",
        sa.Column("stripe_customer_id", sa.Text(), nullable=True),
    )
    op.add_column(
        "user_subscriptions",
        sa.Column("stripe_subscription_id", sa.Text(), nullable=True),
    )
    op.add_column(
        "user_subscriptions",
        sa.Column("stripe_price_id", sa.Text(), nullable=True),
    )
    op.create_unique_constraint(
        "uq_user_subscriptions_stripe_subscription_id",
        "user_subscriptions",
        ["stripe_subscription_id"],
    )

    op.create_table(
        "billing_webhook_events",
        sa.Column("event_id", sa.Text(), nullable=False),
        sa.Column("provider", sa.Text(), nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("event_id"),
    )


def downgrade() -> None:
    op.drop_table("billing_webhook_events")
    op.drop_constraint(
        "uq_user_subscriptions_stripe_subscription_id",
        "user_subscriptions",
        type_="unique",
    )
    op.drop_column("user_subscriptions", "stripe_price_id")
    op.drop_column("user_subscriptions", "stripe_subscription_id")
    op.drop_column("user_subscriptions", "stripe_customer_id")
