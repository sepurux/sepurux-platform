"""add replay attempt tool usage metadata columns

Revision ID: 20260226_0007
Revises: 20260226_0006
Create Date: 2026-02-26 00:00:07.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260226_0007"
down_revision: str | None = "20260226_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


JSONB_COMPAT = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.add_column("replay_attempts", sa.Column("tools_touched", JSONB_COMPAT, nullable=True))
    op.add_column("replay_attempts", sa.Column("tool_call_counts", JSONB_COMPAT, nullable=True))


def downgrade() -> None:
    op.drop_column("replay_attempts", "tool_call_counts")
    op.drop_column("replay_attempts", "tools_touched")
