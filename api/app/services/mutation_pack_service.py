from __future__ import annotations

from uuid import UUID, uuid4

from app.models import Campaign, MutationPack
from app.mutation_registry import get_registered_pack_definition
from app.services.mutation_pack_policy import (
    SYSTEM_MUTATION_PACK_DEFINITIONS,
    coverage_score_for_config,
    evaluate_mutation_pack_config,
)
from sqlalchemy import select
from sqlalchemy.orm import Session


class SystemMutationPackModificationError(Exception):
    pass


class MutationPackInUseError(Exception):
    pass


def create_mutation_pack(
    db: Session,
    *,
    project_id: UUID,
    name: str,
    description: str | None,
    config: object,
    is_system: bool = False,
    coverage_score: int | None = None,
    credit_cost: int = 20,
) -> MutationPack:
    score = coverage_score_for_config(config) if coverage_score is None else coverage_score
    record = MutationPack(
        mutation_pack_id=uuid4(),
        project_id=project_id,
        name=name,
        description=description,
        config=config,
        is_system=is_system,
        coverage_score=score,
        credit_cost=credit_cost,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def ensure_system_mutation_packs(db: Session, *, project_id: UUID) -> list[MutationPack]:
    existing = {
        name
        for name in db.scalars(
            select(MutationPack.name).where(
                MutationPack.project_id == project_id,
                MutationPack.is_system.is_(True),
            )
        )
    }

    created: list[MutationPack] = []
    for definition in SYSTEM_MUTATION_PACK_DEFINITIONS:
        name = str(definition["name"])
        if name in existing:
            continue
        config = definition["config"]
        if not isinstance(config, dict):
            continue
        credit_cost_raw = definition.get("credit_cost")
        credit_cost = int(credit_cost_raw) if isinstance(credit_cost_raw, int) else 20
        record = MutationPack(
            mutation_pack_id=uuid4(),
            project_id=project_id,
            name=name,
            description=str(definition.get("description") or ""),
            config=config,
            is_system=True,
            coverage_score=coverage_score_for_config(config),
            credit_cost=credit_cost,
        )
        db.add(record)
        created.append(record)

    if created:
        db.commit()
        for record in created:
            db.refresh(record)

    return created


def list_mutation_packs(
    db: Session,
    *,
    project_id: UUID,
    include_system: bool = True,
) -> list[MutationPack]:
    ensure_system_mutation_packs(db, project_id=project_id)

    stmt = (
        select(MutationPack)
        .where(MutationPack.project_id == project_id)
        .order_by(
            MutationPack.is_system.desc(),
            MutationPack.created_at.desc(),
            MutationPack.mutation_pack_id.desc(),
        )
    )
    if not include_system:
        stmt = stmt.where(MutationPack.is_system.is_(False))
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


def get_mutation_pack_by_name(
    db: Session,
    *,
    project_id: UUID,
    name: str,
) -> MutationPack | None:
    ensure_system_mutation_packs(db, project_id=project_id)
    stmt = select(MutationPack).where(
        MutationPack.project_id == project_id,
        MutationPack.name == name,
    )
    return db.scalar(stmt)


def resolve_mutation_pack(
    db: Session,
    *,
    project_id: UUID,
    pack_ref: str,
) -> MutationPack | None:
    normalized = pack_ref.strip()
    if not normalized:
        return None

    try:
        pack_id = UUID(normalized)
    except ValueError:
        return get_mutation_pack_by_name(db, project_id=project_id, name=normalized)

    return get_mutation_pack(db, project_id=project_id, mutation_pack_id=pack_id)


def ensure_registered_mutation_pack(
    db: Session,
    *,
    project_id: UUID,
    pack_name: str,
) -> MutationPack | None:
    existing = get_mutation_pack_by_name(db, project_id=project_id, name=pack_name)
    if existing is not None:
        return existing

    definition = get_registered_pack_definition(pack_name)
    if definition is None:
        return None

    config = definition.get("config")
    if not isinstance(config, dict):
        return None

    credit_cost_raw = definition.get("credit_cost")
    credit_cost = int(credit_cost_raw) if isinstance(credit_cost_raw, int) else 20

    return create_mutation_pack(
        db,
        project_id=project_id,
        name=str(definition["name"]),
        description=str(definition.get("description") or ""),
        config=config,
        is_system=True,
        coverage_score=coverage_score_for_config(config),
        credit_cost=credit_cost,
    )


def delete_mutation_pack(
    db: Session,
    *,
    project_id: UUID,
    mutation_pack_id: UUID,
) -> bool:
    record = get_mutation_pack(db, project_id=project_id, mutation_pack_id=mutation_pack_id)
    if record is None:
        return False
    if record.is_system:
        raise SystemMutationPackModificationError("System mutation packs cannot be deleted")

    in_use = db.scalar(
        select(Campaign.campaign_id).where(
            Campaign.project_id == project_id,
            Campaign.mutation_pack_id == mutation_pack_id,
        )
    )
    if in_use is not None:
        raise MutationPackInUseError("Mutation pack is in use by one or more campaigns")

    db.delete(record)
    db.commit()
    return True


def mutation_pack_coverage(record: MutationPack) -> dict[str, object]:
    result = evaluate_mutation_pack_config(record.config)
    return {
        "mutation_pack_id": record.mutation_pack_id,
        "coverage_score": result.coverage_score,
        "categories": result.categories,
        "warning": result.warning,
    }
