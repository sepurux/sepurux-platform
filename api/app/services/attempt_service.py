from __future__ import annotations

from uuid import UUID

from app.models import ReplayAttempt
from app.storage import JsonObjectTooLargeError, get_json_object
from sqlalchemy import select
from sqlalchemy.orm import Session


class AttemptNotFoundError(Exception):
    pass


def list_attempts_for_run(
    db: Session,
    *,
    run_id: UUID,
    limit: int = 50,
    offset: int = 0,
    result: str | None = None,
) -> list[ReplayAttempt]:
    stmt = select(ReplayAttempt).where(ReplayAttempt.run_id == run_id)
    if result:
        stmt = stmt.where(ReplayAttempt.result == result)
    stmt = stmt.order_by(ReplayAttempt.created_at.desc(), ReplayAttempt.attempt_id.desc()).offset(offset).limit(limit)
    return list(db.scalars(stmt))


def get_attempt(db: Session, attempt_id: UUID) -> ReplayAttempt | None:
    return db.get(ReplayAttempt, attempt_id)


def get_attempt_or_raise(db: Session, attempt_id: UUID) -> ReplayAttempt:
    attempt = get_attempt(db, attempt_id)
    if attempt is None:
        raise AttemptNotFoundError("Attempt not found")
    return attempt


def get_attempt_timeline_json(db: Session, attempt_id: UUID, *, max_bytes: int = 1_000_000):
    attempt = get_attempt_or_raise(db, attempt_id)
    if not attempt.artifacts_s3_key:
        raise FileNotFoundError("Timeline artifact not available")
    return get_json_object(attempt.artifacts_s3_key, max_bytes=max_bytes)


__all__ = [
    "AttemptNotFoundError",
    "JsonObjectTooLargeError",
    "get_attempt",
    "get_attempt_or_raise",
    "get_attempt_timeline_json",
    "list_attempts_for_run",
]
