from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Counterfactual


class CounterfactualNotFoundError(Exception):
    pass


def list_counterfactuals_for_attempt(db: Session, *, attempt_id: UUID) -> list[Counterfactual]:
    stmt = (
        select(Counterfactual)
        .where(Counterfactual.attempt_id == attempt_id)
        .order_by(Counterfactual.created_at.asc(), Counterfactual.strategy.asc())
    )
    return list(db.scalars(stmt))


def get_counterfactual(db: Session, counterfactual_id: UUID) -> Counterfactual | None:
    return db.get(Counterfactual, counterfactual_id)


def get_counterfactual_or_raise(db: Session, counterfactual_id: UUID) -> Counterfactual:
    record = get_counterfactual(db, counterfactual_id)
    if record is None:
        raise CounterfactualNotFoundError("Counterfactual not found")
    return record

