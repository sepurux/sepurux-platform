"""add oauth login tables

Revision ID: 20260315_0027
Revises: 20260315_0026
Create Date: 2026-03-15 18:30:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260315_0027"
down_revision: str | None = "20260315_0026"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_identities",
        sa.Column("identity_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.Text(), nullable=False),
        sa.Column("provider_user_id", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("identity_id"),
        sa.UniqueConstraint(
            "provider",
            "provider_user_id",
            name="uq_user_identities_provider_subject",
        ),
    )
    op.create_index("ix_user_identities_user_provider", "user_identities", ["user_id", "provider"])

    op.create_table(
        "oauth_login_states",
        sa.Column("state_token", sa.Text(), nullable=False),
        sa.Column("provider", sa.Text(), nullable=False),
        sa.Column("next_path", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("state_token"),
    )

    op.create_table(
        "auth_session_exchanges",
        sa.Column("exchange_token", sa.Text(), nullable=False),
        sa.Column("session_payload", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("exchange_token"),
    )


def downgrade() -> None:
    op.drop_table("auth_session_exchanges")
    op.drop_table("oauth_login_states")
    op.drop_index("ix_user_identities_user_provider", table_name="user_identities")
    op.drop_table("user_identities")
