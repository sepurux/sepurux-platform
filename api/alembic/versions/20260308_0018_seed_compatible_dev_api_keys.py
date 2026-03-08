"""seed compatible dev api keys for renamed platform

Revision ID: 20260308_0018
Revises: 20260308_0017
Create Date: 2026-03-08 23:40:00.000000
"""

from __future__ import annotations

import hashlib
import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260308_0018"
down_revision: str | None = "20260308_0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DEV_TENANT_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
SEPURUX_DEV_API_KEY_ID = uuid.UUID("44444444-4444-4444-4444-444444444444")
SEPURUX_DEV_API_KEY_PLAINTEXT = "sepurux-dev-key"
SEPURUX_DEV_API_KEY_HASH = hashlib.sha256(SEPURUX_DEV_API_KEY_PLAINTEXT.encode("utf-8")).hexdigest()

LEGACY_DEV_API_KEY_ID = uuid.UUID("55555555-5555-5555-5555-555555555555")
LEGACY_DEV_API_KEY_PLAINTEXT = "crashlab-dev-key"
LEGACY_DEV_API_KEY_HASH = hashlib.sha256(LEGACY_DEV_API_KEY_PLAINTEXT.encode("utf-8")).hexdigest()


def upgrade() -> None:
    insert_sql = sa.text(
        """
        INSERT INTO api_keys (api_key_id, tenant_id, name, key_hash)
        SELECT :api_key_id, :tenant_id, :name, :key_hash
        WHERE EXISTS (SELECT 1 FROM tenants WHERE tenant_id = :tenant_id)
        ON CONFLICT (key_hash) DO NOTHING
        """
    )

    op.execute(
        insert_sql.bindparams(
            api_key_id=SEPURUX_DEV_API_KEY_ID,
            tenant_id=DEV_TENANT_ID,
            name="dev-sepurux",
            key_hash=SEPURUX_DEV_API_KEY_HASH,
        )
    )
    op.execute(
        insert_sql.bindparams(
            api_key_id=LEGACY_DEV_API_KEY_ID,
            tenant_id=DEV_TENANT_ID,
            name="dev-legacy",
            key_hash=LEGACY_DEV_API_KEY_HASH,
        )
    )


def downgrade() -> None:
    delete_sql = sa.text("DELETE FROM api_keys WHERE key_hash IN (:sepurux_hash, :legacy_hash)")
    op.execute(
        delete_sql.bindparams(
            sepurux_hash=SEPURUX_DEV_API_KEY_HASH,
            legacy_hash=LEGACY_DEV_API_KEY_HASH,
        )
    )
