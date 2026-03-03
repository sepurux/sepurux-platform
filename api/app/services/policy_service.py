from __future__ import annotations

from uuid import UUID, uuid4

from app.models import PolicyPack
from sqlalchemy import select
from sqlalchemy.orm import Session


def create_policy_pack(
    db: Session,
    *,
    project_id: UUID,
    name: str,
    engine: str,
    policy: object,
) -> PolicyPack:
    record = PolicyPack(
        policy_pack_id=uuid4(),
        project_id=project_id,
        name=name,
        engine=engine,
        policy=policy,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_policy_packs(db: Session, *, project_id: UUID) -> list[PolicyPack]:
    stmt = (
        select(PolicyPack)
        .where(PolicyPack.project_id == project_id)
        .order_by(PolicyPack.created_at.desc(), PolicyPack.policy_pack_id.desc())
    )
    return list(db.scalars(stmt))


def get_policy_pack(db: Session, *, project_id: UUID, policy_pack_id: UUID) -> PolicyPack | None:
    stmt = select(PolicyPack).where(
        PolicyPack.policy_pack_id == policy_pack_id,
        PolicyPack.project_id == project_id,
    )
    return db.scalar(stmt)
