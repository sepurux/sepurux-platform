from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID

from app.auth import ProjectScope, require_project_scope
from app.db import get_db
from app.schemas import ReplayAttemptDetail
from app.services.attempt_service import (
    AttemptNotFoundError,
    JsonObjectTooLargeError,
    get_attempt_or_raise,
    get_attempt_timeline_json,
)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/attempts", tags=["attempts"])

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]


def _to_attempt_detail(attempt) -> ReplayAttemptDetail:
    return ReplayAttemptDetail(
        attempt_id=attempt.attempt_id,
        run_id=attempt.run_id,
        mutation_id=attempt.mutation_id,
        result=attempt.result,
        failure_reason=attempt.failure_reason,
        artifacts_s3_key=attempt.artifacts_s3_key,
        first_failure_event_index=attempt.first_failure_event_index,
        first_failure_tool=attempt.first_failure_tool,
        seed=attempt.seed,
        mutation_trace=attempt.mutation_trace,
        created_at=attempt.created_at,
    )


@router.get("/{attempt_id}", response_model=ReplayAttemptDetail)
def get_attempt(
    attempt_id: UUID, db: DbSession, project_scope: ProjectScopeDep
) -> ReplayAttemptDetail:
    try:
        attempt = get_attempt_or_raise(
            db, project_id=project_scope.project_id, attempt_id=attempt_id
        )
    except AttemptNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _to_attempt_detail(attempt)


@router.get("/{attempt_id}/timeline")
def get_attempt_timeline(
    attempt_id: UUID, db: DbSession, project_scope: ProjectScopeDep
) -> dict[str, Any]:
    try:
        return get_attempt_timeline_json(
            db,
            project_id=project_scope.project_id,
            attempt_id=attempt_id,
            max_bytes=1_000_000,
        )
    except AttemptNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except JsonObjectTooLargeError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
