"""add rbac models and demo environment seed

Revision ID: 20260309_0019
Revises: 20260308_0018
Create Date: 2026-03-09 00:00:00.000000
"""

from __future__ import annotations

import hashlib
import json
import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260309_0019"
down_revision: str | None = "20260308_0018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DEFAULT_TENANT_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
DEFAULT_PROJECT_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")

ROLE_ADMIN_ID = uuid.UUID("10000000-0000-0000-0000-000000000001")
ROLE_DEVELOPER_ID = uuid.UUID("10000000-0000-0000-0000-000000000002")
ROLE_VIEWER_ID = uuid.UUID("10000000-0000-0000-0000-000000000003")

DEFAULT_USER_ID = uuid.UUID("66666666-6666-6666-6666-666666666666")
DEMO_TENANT_ID = uuid.UUID("77777777-7777-7777-7777-777777777777")
DEMO_USER_ID = uuid.UUID("88888888-8888-8888-8888-888888888888")
DEMO_PROJECT_ID = uuid.UUID("99999999-9999-9999-9999-999999999999")
DEMO_API_KEY_ID = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
DEMO_MUTATION_PACK_ID = uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
DEMO_CAMPAIGN_ID = uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc")

DEMO_API_KEY_PLAINTEXT = "demo_sepurux_key"
DEMO_API_KEY_HASH = hashlib.sha256(DEMO_API_KEY_PLAINTEXT.encode("utf-8")).hexdigest()


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("user_id"),
        sa.UniqueConstraint("email"),
    )

    op.create_table(
        "roles",
        sa.Column("role_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("role_id"),
        sa.UniqueConstraint("name"),
    )

    op.add_column("projects", sa.Column("owner_id", sa.Uuid(), nullable=True))
    op.create_index("ix_projects_owner_id", "projects", ["owner_id"])
    op.create_foreign_key(
        "fk_projects_owner_id",
        "projects",
        "users",
        ["owner_id"],
        ["user_id"],
    )

    op.create_table(
        "project_memberships",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("role_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.project_id"]),
        sa.ForeignKeyConstraint(["role_id"], ["roles.role_id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("user_id", "project_id"),
    )
    op.create_index(
        "ix_project_memberships_project_id", "project_memberships", ["project_id", "role_id"]
    )

    op.add_column("api_keys", sa.Column("project_id", sa.Uuid(), nullable=True))
    op.add_column("api_keys", sa.Column("user_id", sa.Uuid(), nullable=True))
    op.add_column(
        "api_keys",
        sa.Column(
            "is_demo",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "api_keys",
        sa.Column(
            "rate_limit_per_minute",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("120"),
        ),
    )
    op.add_column(
        "api_keys", sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "api_keys",
        sa.Column(
            "request_count_window",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )
    op.create_index("ix_api_keys_project_id", "api_keys", ["project_id"])
    op.create_index("ix_api_keys_user_id", "api_keys", ["user_id"])
    op.create_index("ix_api_keys_is_demo", "api_keys", ["is_demo"])
    op.create_foreign_key(
        "fk_api_keys_project_id",
        "api_keys",
        "projects",
        ["project_id"],
        ["project_id"],
    )
    op.create_foreign_key("fk_api_keys_user_id", "api_keys", "users", ["user_id"], ["user_id"])

    op.add_column(
        "campaigns",
        sa.Column(
            "status",
            sa.Text(),
            nullable=False,
            server_default="ready",
        ),
    )

    op.execute(
        sa.text(
            """
            INSERT INTO roles (role_id, name)
            VALUES
                (:admin_id, 'admin'),
                (:developer_id, 'developer'),
                (:viewer_id, 'viewer')
            ON CONFLICT (name) DO NOTHING
            """
        ).bindparams(
            admin_id=ROLE_ADMIN_ID,
            developer_id=ROLE_DEVELOPER_ID,
            viewer_id=ROLE_VIEWER_ID,
        )
    )

    op.execute(
        sa.text(
            """
            INSERT INTO users (user_id, email)
            VALUES (:user_id, :email)
            ON CONFLICT (email) DO NOTHING
            """
        ).bindparams(
            user_id=DEFAULT_USER_ID,
            email="dev@sepurux.local",
        )
    )

    op.execute(
        sa.text(
            """
            UPDATE projects
            SET owner_id = :owner_id
            WHERE project_id = :project_id
            """
        ).bindparams(
            owner_id=DEFAULT_USER_ID,
            project_id=DEFAULT_PROJECT_ID,
        )
    )

    op.execute(
        sa.text(
            """
            INSERT INTO project_memberships (user_id, project_id, role_id)
            VALUES (:user_id, :project_id, :role_id)
            ON CONFLICT (user_id, project_id) DO NOTHING
            """
        ).bindparams(
            user_id=DEFAULT_USER_ID,
            project_id=DEFAULT_PROJECT_ID,
            role_id=ROLE_ADMIN_ID,
        )
    )

    op.execute(
        sa.text(
            """
            UPDATE api_keys
            SET project_id = :project_id,
                user_id = :user_id
            WHERE tenant_id = :tenant_id
              AND project_id IS NULL
            """
        ).bindparams(
            tenant_id=DEFAULT_TENANT_ID,
            project_id=DEFAULT_PROJECT_ID,
            user_id=DEFAULT_USER_ID,
        )
    )

    op.execute(
        sa.text(
            """
            INSERT INTO tenants (tenant_id, name)
            VALUES (:tenant_id, :name)
            ON CONFLICT (tenant_id) DO NOTHING
            """
        ).bindparams(
            tenant_id=DEMO_TENANT_ID,
            name="Sepurux Demo Tenant",
        )
    )
    op.execute(
        sa.text(
            """
            INSERT INTO users (user_id, email)
            VALUES (:user_id, :email)
            ON CONFLICT (email) DO NOTHING
            """
        ).bindparams(
            user_id=DEMO_USER_ID,
            email="demo@sepurux.local",
        )
    )
    op.execute(
        sa.text(
            """
            INSERT INTO projects (project_id, tenant_id, name, owner_id)
            VALUES (:project_id, :tenant_id, :name, :owner_id)
            ON CONFLICT (project_id) DO NOTHING
            """
        ).bindparams(
            project_id=DEMO_PROJECT_ID,
            tenant_id=DEMO_TENANT_ID,
            name="Sepurux Demo Project",
            owner_id=DEMO_USER_ID,
        )
    )

    op.execute(
        sa.text(
            """
            INSERT INTO project_memberships (user_id, project_id, role_id)
            VALUES (:user_id, :project_id, :role_id)
            ON CONFLICT (user_id, project_id) DO NOTHING
            """
        ).bindparams(
            user_id=DEMO_USER_ID,
            project_id=DEMO_PROJECT_ID,
            role_id=ROLE_DEVELOPER_ID,
        )
    )

    demo_mutation_config = {
        "max_mutations_per_attempt": 1,
        "mutations": [
            {"mutation_id": "demo.schema.rename_field", "type": "schema.rename_field", "weight": 1},
            {"mutation_id": "demo.fault.timeout", "type": "fault.timeout", "prob": 0.2},
            {
                "mutation_id": "demo.latency.delay",
                "type": "latency_delay",
                "random_ms": [300, 2000],
            },
        ],
    }
    op.execute(
        sa.text(
            """
            INSERT INTO mutation_packs (
                mutation_pack_id, project_id, name, description, config, is_system, coverage_score
            )
            VALUES (
                :mutation_pack_id,
                :project_id,
                :name,
                :description,
                CAST(:config AS jsonb),
                false,
                :coverage_score
            )
            ON CONFLICT (mutation_pack_id) DO NOTHING
            """
        ).bindparams(
            mutation_pack_id=DEMO_MUTATION_PACK_ID,
            project_id=DEMO_PROJECT_ID,
            name="core.demo",
            description="Built-in constrained demo mutation pack",
            config=json.dumps(demo_mutation_config),
            coverage_score=60,
        )
    )

    op.execute(
        sa.text(
            """
            INSERT INTO campaigns (
                campaign_id, project_id, mutation_pack_id, name, mutation_set, eval_set, status
            )
            VALUES (
                :campaign_id, :project_id, :mutation_pack_id, :name, CAST(:mutation_set AS jsonb), CAST(:eval_set AS jsonb), :status
            )
            ON CONFLICT (campaign_id) DO NOTHING
            """
        ).bindparams(
            campaign_id=DEMO_CAMPAIGN_ID,
            project_id=DEMO_PROJECT_ID,
            mutation_pack_id=DEMO_MUTATION_PACK_ID,
            name="demo_campaign",
            mutation_set='[{"mutation_id":"baseline"},{"mutation_id":"schema.rename_field"}]',
            eval_set='{"checks":["demo.basic"]}',
            status="ready",
        )
    )

    op.execute(
        sa.text(
            """
            INSERT INTO api_keys (
                api_key_id, tenant_id, project_id, user_id, name, key_hash,
                is_demo, rate_limit_per_minute, request_count_window
            )
            VALUES (
                :api_key_id, :tenant_id, :project_id, :user_id, :name, :key_hash,
                true, :rate_limit, 0
            )
            ON CONFLICT (key_hash) DO NOTHING
            """
        ).bindparams(
            api_key_id=DEMO_API_KEY_ID,
            tenant_id=DEMO_TENANT_ID,
            project_id=DEMO_PROJECT_ID,
            user_id=DEMO_USER_ID,
            name="demo-sepurux",
            key_hash=DEMO_API_KEY_HASH,
            rate_limit=60,
        )
    )


def downgrade() -> None:
    op.drop_column("campaigns", "status")

    op.drop_constraint("fk_api_keys_user_id", "api_keys", type_="foreignkey")
    op.drop_constraint("fk_api_keys_project_id", "api_keys", type_="foreignkey")
    op.drop_index("ix_api_keys_is_demo", table_name="api_keys")
    op.drop_index("ix_api_keys_user_id", table_name="api_keys")
    op.drop_index("ix_api_keys_project_id", table_name="api_keys")
    op.drop_column("api_keys", "request_count_window")
    op.drop_column("api_keys", "window_started_at")
    op.drop_column("api_keys", "rate_limit_per_minute")
    op.drop_column("api_keys", "is_demo")
    op.drop_column("api_keys", "user_id")
    op.drop_column("api_keys", "project_id")

    op.drop_index("ix_project_memberships_project_id", table_name="project_memberships")
    op.drop_table("project_memberships")

    op.drop_constraint("fk_projects_owner_id", "projects", type_="foreignkey")
    op.drop_index("ix_projects_owner_id", table_name="projects")
    op.drop_column("projects", "owner_id")

    op.drop_table("roles")
    op.drop_table("users")
