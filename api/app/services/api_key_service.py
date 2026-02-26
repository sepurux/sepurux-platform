from __future__ import annotations

from uuid import UUID, uuid4

from app.auth import generate_api_key, hash_api_key
from app.models import ApiKey
from sqlalchemy.orm import Session


def create_api_key_for_tenant(
    db: Session,
    *,
    tenant_id: UUID,
    name: str,
) -> tuple[ApiKey, str]:
    plaintext = generate_api_key()
    record = ApiKey(
        api_key_id=uuid4(),
        tenant_id=tenant_id,
        name=name,
        key_hash=hash_api_key(plaintext),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record, plaintext
