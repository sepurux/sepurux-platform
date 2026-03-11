"""add password auth fields for user login

Revision ID: 20260310_0020
Revises: 20260309_0019
Create Date: 2026-03-10 00:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260310_0020"
down_revision: str | None = "20260309_0019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("name", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("password_hash", sa.Text(), nullable=True))

    op.execute(
        sa.text(
            """
            UPDATE users
            SET name = CASE
                WHEN email = 'dev@sepurux.local' THEN 'Local Dev'
                WHEN email = 'demo@sepurux.local' THEN 'Demo User'
                ELSE name
            END
            WHERE name IS NULL
            """
        )
    )


def downgrade() -> None:
    op.drop_column("users", "password_hash")
    op.drop_column("users", "name")
