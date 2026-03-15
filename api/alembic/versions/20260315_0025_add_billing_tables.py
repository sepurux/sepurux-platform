"""add billing tables

Revision ID: 20260315_0025
Revises: 20260314_0024
Create Date: 2026-03-15 09:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence
from uuid import UUID

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260315_0025"
down_revision: str | None = "20260314_0024"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


FREE_PLAN_ID = UUID("30000000-0000-0000-0000-000000000001")
PRO_PLAN_ID = UUID("30000000-0000-0000-0000-000000000002")
TEAM_PLAN_ID = UUID("30000000-0000-0000-0000-000000000003")
ENTERPRISE_PLAN_ID = UUID("30000000-0000-0000-0000-000000000004")


def upgrade() -> None:
    op.create_table(
        "subscription_plans",
        sa.Column("plan_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("monthly_price", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("monthly_credits", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("features", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("plan_id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "user_subscriptions",
        sa.Column("user_subscription_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("plan_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="active"),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("renewal_date", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["plan_id"], ["subscription_plans.plan_id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("user_subscription_id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_table(
        "credit_wallets",
        sa.Column("wallet_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("balance", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("monthly_credits", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("topup_credits", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("wallet_id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_table(
        "credit_transactions",
        sa.Column("credit_transaction_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("credit_transaction_id"),
    )
    op.create_index("ix_user_subscriptions_plan_id", "user_subscriptions", ["plan_id"])
    op.create_index("ix_credit_transactions_user_created_at", "credit_transactions", ["user_id", "created_at"])

    plans_table = sa.table(
        "subscription_plans",
        sa.column("plan_id", sa.Uuid()),
        sa.column("name", sa.Text()),
        sa.column("monthly_price", sa.Integer()),
        sa.column("monthly_credits", sa.Integer()),
        sa.column("features", sa.JSON()),
    )
    op.bulk_insert(
        plans_table,
        [
            {
                "plan_id": FREE_PLAN_ID,
                "name": "Free",
                "monthly_price": 0,
                "monthly_credits": 250,
                "features": {
                    "workspace_tier": "starter",
                    "queue_priority": "normal",
                    "highlights": ["250 credits / month", "Single workspace"],
                },
            },
            {
                "plan_id": PRO_PLAN_ID,
                "name": "Pro",
                "monthly_price": 49,
                "monthly_credits": 2000,
                "features": {
                    "workspace_tier": "team",
                    "queue_priority": "priority",
                    "highlights": ["2,000 credits / month", "Priority execution"],
                },
            },
            {
                "plan_id": TEAM_PLAN_ID,
                "name": "Team",
                "monthly_price": 199,
                "monthly_credits": 10000,
                "features": {
                    "workspace_tier": "team",
                    "queue_priority": "priority",
                    "highlights": ["10,000 credits / month", "Shared workspace access"],
                },
            },
            {
                "plan_id": ENTERPRISE_PLAN_ID,
                "name": "Enterprise",
                "monthly_price": 999,
                "monthly_credits": 50000,
                "features": {
                    "workspace_tier": "enterprise",
                    "queue_priority": "priority",
                    "highlights": ["50,000 credits / month", "Enterprise governance"],
                },
            },
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_credit_transactions_user_created_at", table_name="credit_transactions")
    op.drop_index("ix_user_subscriptions_plan_id", table_name="user_subscriptions")
    op.drop_table("credit_transactions")
    op.drop_table("credit_wallets")
    op.drop_table("user_subscriptions")
    op.drop_table("subscription_plans")
