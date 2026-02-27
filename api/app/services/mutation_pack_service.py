from __future__ import annotations

from uuid import UUID, uuid4

from app.models import MutationPack
from sqlalchemy import select
from sqlalchemy.orm import Session


def create_mutation_pack(
    db: Session,
    *,
    project_id: UUID,
    name: str,
    description: str | None,
    config: object,
) -> MutationPack:
    record = MutationPack(
        mutation_pack_id=uuid4(),
        project_id=project_id,
        name=name,
        description=description,
        config=config,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_mutation_packs(db: Session, *, project_id: UUID) -> list[MutationPack]:
    stmt = (
        select(MutationPack)
        .where(MutationPack.project_id == project_id)
        .order_by(MutationPack.created_at.desc(), MutationPack.mutation_pack_id.desc())
    )
    return list(db.scalars(stmt))


def get_mutation_pack(
    db: Session,
    *,
    project_id: UUID,
    mutation_pack_id: UUID,
) -> MutationPack | None:
    stmt = select(MutationPack).where(
        MutationPack.project_id == project_id,
        MutationPack.mutation_pack_id == mutation_pack_id,
    )
    return db.scalar(stmt)
