"""add policy pack versions and run policy snapshots

Revision ID: 20260304_0014
Revises: 20260303_0013
Create Date: 2026-03-04 00:20:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence
from uuid import uuid4

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260304_0014"
down_revision: str | None = "20260303_0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

JSONB_COMPAT = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "policy_pack_versions",
        sa.Column("version_id", sa.Uuid(), nullable=False),
        sa.Column("policy_pack_id", sa.Uuid(), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("policy", JSONB_COMPAT, nullable=False),
        sa.Column("created_by", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["policy_pack_id"], ["policy_packs.policy_pack_id"]),
        sa.PrimaryKeyConstraint("version_id"),
        sa.UniqueConstraint(
            "policy_pack_id",
            "version_number",
            name="uq_policy_pack_versions_policy_pack_version",
        ),
    )
    op.create_index(
        "ix_policy_pack_versions_policy_pack_id",
        "policy_pack_versions",
        ["policy_pack_id"],
    )

    op.add_column("policy_packs", sa.Column("active_version_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_policy_packs_active_version_id",
        "policy_packs",
        "policy_pack_versions",
        ["active_version_id"],
        ["version_id"],
    )
    op.create_index(
        "ix_policy_packs_active_version_id",
        "policy_packs",
        ["active_version_id"],
    )

    op.add_column(
        "runs",
        sa.Column("effective_policy_pack_version_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_runs_effective_policy_pack_version_id",
        "runs",
        "policy_pack_versions",
        ["effective_policy_pack_version_id"],
        ["version_id"],
    )
    op.create_index(
        "ix_runs_effective_policy_pack_version_id",
        "runs",
        ["effective_policy_pack_version_id"],
    )

    connection = op.get_bind()
    insert_policy_pack_version = sa.text(
        """
        INSERT INTO policy_pack_versions
            (version_id, policy_pack_id, version_number, policy, created_by)
        VALUES
            (:version_id, :policy_pack_id, :version_number, :policy, :created_by)
        """
    ).bindparams(sa.bindparam("policy", type_=JSONB_COMPAT))

    policy_pack_rows = connection.execute(
        sa.text("SELECT policy_pack_id, policy FROM policy_packs")
    ).mappings()

    active_version_by_pack: dict[object, object] = {}
    for row in policy_pack_rows:
        policy_pack_id = row["policy_pack_id"]
        version_id = uuid4()
        connection.execute(
            insert_policy_pack_version,
            {
                "version_id": version_id,
                "policy_pack_id": policy_pack_id,
                "version_number": 1,
                "policy": row["policy"],
                "created_by": "migration",
            },
        )
        connection.execute(
            sa.text(
                """
                UPDATE policy_packs
                SET active_version_id = :active_version_id
                WHERE policy_pack_id = :policy_pack_id
                """
            ),
            {
                "active_version_id": version_id,
                "policy_pack_id": policy_pack_id,
            },
        )
        active_version_by_pack[policy_pack_id] = version_id

    run_rows = connection.execute(
        sa.text("SELECT run_id, policy_pack_id FROM runs WHERE policy_pack_id IS NOT NULL")
    ).mappings()
    for row in run_rows:
        policy_pack_id = row["policy_pack_id"]
        active_version_id = active_version_by_pack.get(policy_pack_id)
        if active_version_id is None:
            continue
        connection.execute(
            sa.text(
                """
                UPDATE runs
                SET effective_policy_pack_version_id = :effective_policy_pack_version_id
                WHERE run_id = :run_id
                """
            ),
            {
                "effective_policy_pack_version_id": active_version_id,
                "run_id": row["run_id"],
            },
        )


def downgrade() -> None:
    op.drop_index("ix_runs_effective_policy_pack_version_id", table_name="runs")
    op.drop_constraint("fk_runs_effective_policy_pack_version_id", "runs", type_="foreignkey")
    op.drop_column("runs", "effective_policy_pack_version_id")

    op.drop_index("ix_policy_packs_active_version_id", table_name="policy_packs")
    op.drop_constraint("fk_policy_packs_active_version_id", "policy_packs", type_="foreignkey")
    op.drop_column("policy_packs", "active_version_id")

    op.drop_index("ix_policy_pack_versions_policy_pack_id", table_name="policy_pack_versions")
    op.drop_table("policy_pack_versions")
