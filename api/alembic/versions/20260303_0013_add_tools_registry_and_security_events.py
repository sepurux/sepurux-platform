"""add tools registry and security events

Revision ID: 20260303_0013
Revises: 20260303_0012
Create Date: 2026-03-03 00:13:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260303_0013"
down_revision: str | None = "20260303_0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

JSONB_COMPAT = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "tools_registry",
        sa.Column("tool_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("zone", sa.Text(), nullable=False, server_default="untrusted"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.project_id"]),
        sa.PrimaryKeyConstraint("tool_id"),
        sa.UniqueConstraint("project_id", "name", name="uq_tools_registry_project_name"),
    )
    op.create_index("ix_tools_registry_project_id", "tools_registry", ["project_id"])

    op.create_table(
        "security_events",
        sa.Column("security_event_id", sa.Uuid(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("attempt_id", sa.Uuid(), nullable=False),
        sa.Column("event_index", sa.Integer(), nullable=False),
        sa.Column("tool", sa.Text(), nullable=False),
        sa.Column("zone", sa.Text(), nullable=False),
        sa.Column("risk_score", sa.Float(), nullable=False),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("matches", JSONB_COMPAT, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["attempt_id"], ["replay_attempts.attempt_id"]),
        sa.ForeignKeyConstraint(["run_id"], ["runs.run_id"]),
        sa.PrimaryKeyConstraint("security_event_id"),
    )
    op.create_index("ix_security_events_run_id", "security_events", ["run_id"])
    op.create_index("ix_security_events_attempt_id", "security_events", ["attempt_id"])
    op.create_index("ix_security_events_action", "security_events", ["action"])


def downgrade() -> None:
    op.drop_index("ix_security_events_action", table_name="security_events")
    op.drop_index("ix_security_events_attempt_id", table_name="security_events")
    op.drop_index("ix_security_events_run_id", table_name="security_events")
    op.drop_table("security_events")

    op.drop_index("ix_tools_registry_project_id", table_name="tools_registry")
    op.drop_table("tools_registry")
