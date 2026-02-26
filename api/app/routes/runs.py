from __future__ import annotations

from typing import Annotated
from uuid import UUID

from app.auth import ProjectScope, require_project_scope
from app.db import get_db
from app.models import ReplayAttempt
from app.schemas import ReplayAttemptListItem, RunCreateRequest, RunMetadata
from app.services.attempt_service import list_attempts_for_run
from app.services.run_service import (
    RelatedRecordNotFoundError,
    create_run_and_enqueue,
    list_recent_runs,
    run_metadata,
)
from app.services.run_service import (
    get_run as get_run_record,
)
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/runs", tags=["runs"])

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]


def _to_run_metadata(run) -> RunMetadata:
    return RunMetadata(**run_metadata(run))


def _to_attempt_list_item(attempt: ReplayAttempt) -> ReplayAttemptListItem:
    return ReplayAttemptListItem(
        attempt_id=attempt.attempt_id,
        mutation_id=attempt.mutation_id,
        result=attempt.result,
        failure_reason=attempt.failure_reason,
        first_failure_event_index=attempt.first_failure_event_index,
        first_failure_tool=attempt.first_failure_tool,
        created_at=attempt.created_at,
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=RunMetadata)
def post_run(
    payload: RunCreateRequest, db: DbSession, project_scope: ProjectScopeDep
) -> RunMetadata:
    try:
        run = create_run_and_enqueue(
            db,
            project_id=project_scope.project_id,
            trace_id=payload.trace_id,
            campaign_id=payload.campaign_id,
        )
    except RelatedRecordNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return _to_run_metadata(run)


@router.get("/{run_id}", response_model=RunMetadata)
def get_run(run_id: UUID, db: DbSession, project_scope: ProjectScopeDep) -> RunMetadata:
    run = get_run_record(db, project_id=project_scope.project_id, run_id=run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    return _to_run_metadata(run)


@router.get("", response_model=list[RunMetadata])
def get_runs(
    db: DbSession,
    project_scope: ProjectScopeDep,
    limit: int = Query(20, ge=1, le=100),
) -> list[RunMetadata]:
    return [
        _to_run_metadata(run)
        for run in list_recent_runs(db, project_id=project_scope.project_id, limit=limit)
    ]


@router.get("/{run_id}/attempts", response_model=list[ReplayAttemptListItem])
def get_run_attempts(
    run_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    result: str | None = Query(None),
) -> list[ReplayAttemptListItem]:
    attempts = list_attempts_for_run(
        db,
        project_id=project_scope.project_id,
        run_id=run_id,
        limit=limit,
        offset=offset,
        result=result,
    )
    return [_to_attempt_list_item(attempt) for attempt in attempts]
