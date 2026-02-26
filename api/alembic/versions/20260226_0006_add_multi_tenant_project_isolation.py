"""add multi-tenant project isolation and api keys

Revision ID: 20260226_0006
Revises: 20260225_0005
Create Date: 2026-02-26 00:00:06.000000
"""

from __future__ import annotations

import hashlib
import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260226_0006"
down_revision: str | None = "20260225_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DEV_TENANT_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
DEV_PROJECT_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")
DEV_API_KEY_ID = uuid.UUID("33333333-3333-3333-3333-333333333333")
DEV_API_KEY_PLAINTEXT = "crashlab-dev-key"
DEV_API_KEY_HASH = hashlib.sha256(DEV_API_KEY_PLAINTEXT.encode("utf-8")).hexdigest()


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("tenant_id"),
    )

    op.create_table(
        "projects",
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.tenant_id"]),
        sa.PrimaryKeyConstraint("project_id"),
    )
    op.create_index("ix_projects_tenant_id", "projects", ["tenant_id"])

    op.create_table(
        "api_keys",
        sa.Column("api_key_id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("key_hash", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.tenant_id"]),
        sa.PrimaryKeyConstraint("api_key_id"),
        sa.UniqueConstraint("key_hash"),
    )
    op.create_index("ix_api_keys_tenant_id", "api_keys", ["tenant_id"])

    op.execute(
        sa.text(
            """
            INSERT INTO tenants (tenant_id, name)
            VALUES (:tenant_id, :name)
            """
        ).bindparams(tenant_id=DEV_TENANT_ID, name="Default Tenant")
    )
    op.execute(
        sa.text(
            """
            INSERT INTO projects (project_id, tenant_id, name)
            VALUES (:project_id, :tenant_id, :name)
            """
        ).bindparams(
            project_id=DEV_PROJECT_ID,
            tenant_id=DEV_TENANT_ID,
            name="Default Project",
        )
    )
    op.execute(
        sa.text(
            """
            INSERT INTO api_keys (api_key_id, tenant_id, name, key_hash)
            VALUES (:api_key_id, :tenant_id, :name, :key_hash)
            """
        ).bindparams(
            api_key_id=DEV_API_KEY_ID,
            tenant_id=DEV_TENANT_ID,
            name="dev-default",
            key_hash=DEV_API_KEY_HASH,
        )
    )

    for table_name in ("traces", "campaigns", "runs", "replay_attempts", "counterfactuals"):
        op.add_column(table_name, sa.Column("project_id", sa.Uuid(), nullable=True))
        op.execute(
            sa.text(f"UPDATE {table_name} SET project_id = :project_id WHERE project_id IS NULL")
            .bindparams(project_id=DEV_PROJECT_ID)
        )

    op.create_foreign_key("fk_traces_project_id", "traces", "projects", ["project_id"], ["project_id"])
    op.create_index("ix_traces_project_id", "traces", ["project_id"])
    op.alter_column("traces", "project_id", nullable=False)

    op.create_foreign_key(
        "fk_campaigns_project_id",
        "campaigns",
        "projects",
        ["project_id"],
        ["project_id"],
    )
    op.create_index("ix_campaigns_project_id", "campaigns", ["project_id"])
    op.alter_column("campaigns", "project_id", nullable=False)

    op.create_foreign_key("fk_runs_project_id", "runs", "projects", ["project_id"], ["project_id"])
    op.create_index("ix_runs_project_id", "runs", ["project_id"])
    op.alter_column("runs", "project_id", nullable=False)

    op.create_foreign_key(
        "fk_replay_attempts_project_id",
        "replay_attempts",
        "projects",
        ["project_id"],
        ["project_id"],
    )
    op.create_index("ix_replay_attempts_project_id", "replay_attempts", ["project_id"])
    op.alter_column("replay_attempts", "project_id", nullable=False)

    op.create_foreign_key(
        "fk_counterfactuals_project_id",
        "counterfactuals",
        "projects",
        ["project_id"],
        ["project_id"],
    )
    op.create_index("ix_counterfactuals_project_id", "counterfactuals", ["project_id"])
    op.alter_column("counterfactuals", "project_id", nullable=False)


def downgrade() -> None:
    op.drop_index("ix_counterfactuals_project_id", table_name="counterfactuals")
    op.drop_constraint("fk_counterfactuals_project_id", "counterfactuals", type_="foreignkey")
    op.drop_column("counterfactuals", "project_id")

    op.drop_index("ix_replay_attempts_project_id", table_name="replay_attempts")
    op.drop_constraint("fk_replay_attempts_project_id", "replay_attempts", type_="foreignkey")
    op.drop_column("replay_attempts", "project_id")

    op.drop_index("ix_runs_project_id", table_name="runs")
    op.drop_constraint("fk_runs_project_id", "runs", type_="foreignkey")
    op.drop_column("runs", "project_id")

    op.drop_index("ix_campaigns_project_id", table_name="campaigns")
    op.drop_constraint("fk_campaigns_project_id", "campaigns", type_="foreignkey")
    op.drop_column("campaigns", "project_id")

    op.drop_index("ix_traces_project_id", table_name="traces")
    op.drop_constraint("fk_traces_project_id", "traces", type_="foreignkey")
    op.drop_column("traces", "project_id")

    op.drop_index("ix_api_keys_tenant_id", table_name="api_keys")
    op.drop_table("api_keys")

    op.drop_index("ix_projects_tenant_id", table_name="projects")
    op.drop_table("projects")

    op.drop_table("tenants")
