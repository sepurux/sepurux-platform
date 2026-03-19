"""seed super_admin role

Revision ID: 20260319_0031
Revises: 20260319_0030
Create Date: 2026-03-19 00:45:00.000000
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260319_0031"
down_revision: str | None = "20260319_0030"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ROLE_SUPER_ADMIN_ID = uuid.UUID("10000000-0000-0000-0000-000000000004")


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            INSERT INTO roles (role_id, name)
            VALUES (:role_id, 'super_admin')
            ON CONFLICT (name) DO NOTHING
            """
        ).bindparams(role_id=ROLE_SUPER_ADMIN_ID)
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            DELETE FROM roles
            WHERE role_id = :role_id
              AND NOT EXISTS (
                SELECT 1
                FROM project_memberships pm
                WHERE pm.role_id = roles.role_id
              )
            """
        ).bindparams(role_id=ROLE_SUPER_ADMIN_ID)
    )
