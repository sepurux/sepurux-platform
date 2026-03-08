"""add trace validation metadata and normalized payload storage

Revision ID: 20260307_0016
Revises: 20260306_0015
Create Date: 2026-03-07 19:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260307_0016"
down_revision: str | None = "20260306_0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

JSONB_COMPAT = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.add_column(
        "traces",
        sa.Column("sdk_meta", sa.Text(), nullable=True),
    )
    op.add_column(
        "traces",
        sa.Column(
            "trace_version",
            sa.Text(),
            nullable=False,
            server_default=sa.text("'0.1'"),
        ),
    )
    op.add_column(
        "traces",
        sa.Column(
            "validation_status",
            sa.Text(),
            nullable=False,
            server_default=sa.text("'valid'"),
        ),
    )
    op.add_column(
        "traces",
        sa.Column("validation_errors", JSONB_COMPAT, nullable=True),
    )
    op.add_column(
        "traces",
        sa.Column("normalized_payload", JSONB_COMPAT, nullable=True),
    )

    op.create_check_constraint(
        "ck_traces_validation_status",
        "traces",
        "validation_status IN ('valid', 'invalid')",
    )
    op.create_index(
        "ix_traces_trace_version",
        "traces",
        ["trace_version"],
    )
    op.create_index(
        "ix_traces_validation_status",
        "traces",
        ["validation_status"],
    )


def downgrade() -> None:
    op.drop_index("ix_traces_validation_status", table_name="traces")
    op.drop_index("ix_traces_trace_version", table_name="traces")
    op.drop_constraint("ck_traces_validation_status", "traces", type_="check")

    op.drop_column("traces", "normalized_payload")
    op.drop_column("traces", "validation_errors")
    op.drop_column("traces", "validation_status")
    op.drop_column("traces", "trace_version")
    op.drop_column("traces", "sdk_meta")
