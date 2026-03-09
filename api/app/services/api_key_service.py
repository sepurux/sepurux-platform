from __future__ import annotations

from uuid import UUID, uuid4

from app.auth import generate_api_key, hash_api_key
from app.models import ApiKey
from sqlalchemy import select
from sqlalchemy.orm import Session


def create_api_key_for_tenant(
    db: Session,
    *,
    tenant_id: UUID,
    name: str,
    project_id: UUID | None = None,
    user_id: UUID | None = None,
    is_demo: bool = False,
    rate_limit_per_minute: int = 120,
) -> tuple[ApiKey, str]:
    plaintext = generate_api_key()
    record = ApiKey(
        api_key_id=uuid4(),
        tenant_id=tenant_id,
        project_id=project_id,
        user_id=user_id,
        name=name,
        key_hash=hash_api_key(plaintext),
        is_demo=is_demo,
        rate_limit_per_minute=rate_limit_per_minute,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record, plaintext


def list_api_keys_for_tenant(db: Session, *, tenant_id: UUID) -> list[ApiKey]:
    stmt = (
        select(ApiKey)
        .where(ApiKey.tenant_id == tenant_id)
        .order_by(ApiKey.created_at.desc(), ApiKey.api_key_id.desc())
    )
    return list(db.scalars(stmt))
