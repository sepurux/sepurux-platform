"""add hardening templates and run template links

Revision ID: 20260303_0012
Revises: 20260302_0011
Create Date: 2026-03-03 00:00:12.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260303_0012"
down_revision: str | None = "20260302_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

JSONB_COMPAT = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "hardening_templates",
        sa.Column("template_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("config", JSONB_COMPAT, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.project_id"]),
        sa.PrimaryKeyConstraint("template_id"),
    )
    op.create_index(
        "ix_hardening_templates_project_id",
        "hardening_templates",
        ["project_id"],
    )

    op.create_table(
        "run_template_links",
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("template_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["run_id"], ["runs.run_id"]),
        sa.ForeignKeyConstraint(["template_id"], ["hardening_templates.template_id"]),
        sa.PrimaryKeyConstraint("run_id", "template_id"),
    )
    op.create_index("ix_run_template_links_template_id", "run_template_links", ["template_id"])


def downgrade() -> None:
    op.drop_index("ix_run_template_links_template_id", table_name="run_template_links")
    op.drop_table("run_template_links")

    op.drop_index("ix_hardening_templates_project_id", table_name="hardening_templates")
    op.drop_table("hardening_templates")
