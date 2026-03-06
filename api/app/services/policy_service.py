from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from app.models import PolicyPack, PolicyPackVersion
from app.services.audit_service import create_audit_event
from sqlalchemy import func, select
from sqlalchemy.orm import Session


def create_policy_pack(
    db: Session,
    *,
    project_id: UUID,
    name: str,
    engine: str,
    policy: object,
    created_by: str | None = None,
    actor: str | None = None,
) -> PolicyPack:
    record = PolicyPack(
        policy_pack_id=uuid4(),
        project_id=project_id,
        name=name,
        engine=engine,
        policy=policy,
        active_version_id=None,
    )
    db.add(record)
    db.flush()

    version = PolicyPackVersion(
        version_id=uuid4(),
        policy_pack_id=record.policy_pack_id,
        version_number=1,
        policy=policy,
        created_by=created_by,
    )
    db.add(version)
    db.flush()

    record.active_version_id = version.version_id
    db.commit()
    db.refresh(record)
    create_audit_event(
        db,
        project_id=project_id,
        event_type="policy_pack.created",
        actor=actor,
        metadata={
            "policy_pack_id": str(record.policy_pack_id),
            "name": record.name,
            "engine": record.engine,
            "active_version_id": str(record.active_version_id)
            if record.active_version_id is not None
            else None,
            "active_version_number": 1,
        },
    )
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


def list_policy_pack_versions(
    db: Session, *, project_id: UUID, policy_pack_id: UUID
) -> list[PolicyPackVersion]:
    stmt = (
        select(PolicyPackVersion)
        .join(PolicyPack, PolicyPack.policy_pack_id == PolicyPackVersion.policy_pack_id)
        .where(
            PolicyPack.project_id == project_id,
            PolicyPack.policy_pack_id == policy_pack_id,
        )
        .order_by(PolicyPackVersion.version_number.desc())
    )
    return list(db.scalars(stmt))


def update_policy_pack(
    db: Session,
    *,
    project_id: UUID,
    policy_pack_id: UUID,
    name: str | None,
    engine: str | None,
    policy: Any,
    created_by: str | None = None,
    actor: str | None = None,
) -> PolicyPack | None:
    record = get_policy_pack(db, project_id=project_id, policy_pack_id=policy_pack_id)
    if record is None:
        return None

    next_version = _next_version_number(db, policy_pack_id=record.policy_pack_id) + 1
    version = PolicyPackVersion(
        version_id=uuid4(),
        policy_pack_id=record.policy_pack_id,
        version_number=next_version,
        policy=policy,
        created_by=created_by,
    )
    db.add(version)
    db.flush()

    if name is not None and name.strip():
        record.name = name.strip()
    if engine is not None and engine.strip():
        record.engine = engine.strip()
    record.active_version_id = version.version_id
    db.add(record)
    db.commit()
    db.refresh(record)
    create_audit_event(
        db,
        project_id=project_id,
        event_type="policy_pack.updated",
        actor=actor,
        metadata={
            "policy_pack_id": str(record.policy_pack_id),
            "name": record.name,
            "engine": record.engine,
            "active_version_id": str(record.active_version_id)
            if record.active_version_id is not None
            else None,
            "active_version_number": next_version,
        },
    )
    return record


def rollback_policy_pack(
    db: Session,
    *,
    project_id: UUID,
    policy_pack_id: UUID,
    version_number: int,
    actor: str | None = None,
) -> PolicyPack | None:
    record = get_policy_pack(db, project_id=project_id, policy_pack_id=policy_pack_id)
    if record is None:
        return None

    version = db.scalar(
        select(PolicyPackVersion).where(
            PolicyPackVersion.policy_pack_id == policy_pack_id,
            PolicyPackVersion.version_number == version_number,
        )
    )
    if version is None:
        return None

    record.active_version_id = version.version_id
    db.add(record)
    db.commit()
    db.refresh(record)
    create_audit_event(
        db,
        project_id=project_id,
        event_type="policy_pack.rollback",
        actor=actor,
        metadata={
            "policy_pack_id": str(record.policy_pack_id),
            "active_version_id": str(record.active_version_id)
            if record.active_version_id is not None
            else None,
            "active_version_number": version_number,
        },
    )
    return record


def get_policy_pack_active_version(
    db: Session,
    *,
    policy_pack: PolicyPack,
    create_if_missing: bool = True,
) -> PolicyPackVersion | None:
    if policy_pack.active_version_id is not None:
        active = db.scalar(
            select(PolicyPackVersion).where(
                PolicyPackVersion.policy_pack_id == policy_pack.policy_pack_id,
                PolicyPackVersion.version_id == policy_pack.active_version_id,
            )
        )
        if active is not None:
            return active

    latest = db.scalar(
        select(PolicyPackVersion)
        .where(PolicyPackVersion.policy_pack_id == policy_pack.policy_pack_id)
        .order_by(PolicyPackVersion.version_number.desc())
        .limit(1)
    )
    if latest is not None:
        if create_if_missing and policy_pack.active_version_id != latest.version_id:
            policy_pack.active_version_id = latest.version_id
            db.add(policy_pack)
            db.flush()
        return latest

    if not create_if_missing or policy_pack.policy is None:
        return None

    if policy_pack.policy is not None:
        created = PolicyPackVersion(
            version_id=uuid4(),
            policy_pack_id=policy_pack.policy_pack_id,
            version_number=1,
            policy=policy_pack.policy,
            created_by="system",
        )
        db.add(created)
        db.flush()
        policy_pack.active_version_id = created.version_id
        db.add(policy_pack)
        db.flush()
        return created

    return latest


def get_policy_pack_active_version_number(
    db: Session,
    *,
    policy_pack: PolicyPack,
    create_if_missing: bool = True,
) -> int | None:
    active = get_policy_pack_active_version(
        db,
        policy_pack=policy_pack,
        create_if_missing=create_if_missing,
    )
    if active is None:
        return None
    return active.version_number


def _next_version_number(db: Session, *, policy_pack_id: UUID) -> int:
    current = db.scalar(
        select(func.max(PolicyPackVersion.version_number)).where(
            PolicyPackVersion.policy_pack_id == policy_pack_id
        )
    )
    if isinstance(current, int):
        return current
    return 0
