from __future__ import annotations

from uuid import UUID

from app.models import Counterfactual
from sqlalchemy import select
from sqlalchemy.orm import Session


class CounterfactualNotFoundError(Exception):
    pass


def list_counterfactuals_for_attempt(
    db: Session,
    *,
    project_id: UUID,
    attempt_id: UUID,
) -> list[Counterfactual]:
    stmt = (
        select(Counterfactual)
        .where(
            Counterfactual.attempt_id == attempt_id,
            Counterfactual.project_id == project_id,
        )
        .order_by(Counterfactual.created_at.asc(), Counterfactual.strategy.asc())
    )
    return list(db.scalars(stmt))


def get_counterfactual(
    db: Session, *, project_id: UUID, counterfactual_id: UUID
) -> Counterfactual | None:
    stmt = select(Counterfactual).where(
        Counterfactual.counterfactual_id == counterfactual_id,
        Counterfactual.project_id == project_id,
    )
    return db.scalar(stmt)


def get_counterfactual_or_raise(
    db: Session,
    *,
    project_id: UUID,
    counterfactual_id: UUID,
) -> Counterfactual:
    record = get_counterfactual(db, project_id=project_id, counterfactual_id=counterfactual_id)
    if record is None:
        raise CounterfactualNotFoundError("Counterfactual not found")
    return record
