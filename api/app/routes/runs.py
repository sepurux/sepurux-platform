from __future__ import annotations

from typing import Annotated
from uuid import UUID

from app.auth import ProjectScope, require_project_scope
from app.db import get_db
from app.models import PolicyEvent, ReplayAttempt
from app.schemas import (
    ApplyTemplateRunResponse,
    PolicyEventListItem,
    ReplayAttemptListItem,
    RunCreateRequest,
    RunMetadata,
)
from app.services.attempt_service import list_attempts_for_run
from app.services.run_service import (
    RelatedRecordNotFoundError,
    create_run_and_enqueue,
    get_run_quality_metrics,
    list_policy_events_for_run,
    list_recent_runs,
    run_metadata,
)
from app.services.run_service import (
    get_run as get_run_record,
)
from app.services.template_service import (
    RunNotFoundError as TemplateRunNotFoundError,
)
from app.services.template_service import (
    TemplateNotFoundError,
    apply_template_and_enqueue,
)
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/runs", tags=["runs"])

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]


def _to_run_metadata(run, *, metrics: dict[str, object] | None = None) -> RunMetadata:
    payload = run_metadata(run)
    if metrics is not None:
        payload["pass_rate"] = metrics.get("pass_rate")
        payload["unsafe_count"] = metrics.get("unsafe_count")
    return RunMetadata(**payload)


def _to_attempt_list_item(attempt: ReplayAttempt) -> ReplayAttemptListItem:
    return ReplayAttemptListItem(
        attempt_id=attempt.attempt_id,
        mutation_id=attempt.mutation_id,
        result=attempt.result,
        failure_reason=attempt.failure_reason,
        first_failure_event_index=attempt.first_failure_event_index,
        first_failure_tool=attempt.first_failure_tool,
        seed=attempt.seed,
        created_at=attempt.created_at,
    )


def _to_policy_event_list_item(policy_event: PolicyEvent) -> PolicyEventListItem:
    return PolicyEventListItem(
        policy_event_id=policy_event.policy_event_id,
        run_id=policy_event.run_id,
        attempt_id=policy_event.attempt_id,
        event_index=policy_event.event_index,
        tool=policy_event.tool,
        action=policy_event.action,
        decision=policy_event.decision,
        reason=policy_event.reason,
        input=policy_event.input,
        created_at=policy_event.created_at,
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
            policy_pack_id=payload.policy_pack_id,
        )
    except RelatedRecordNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return _to_run_metadata(run)


@router.get("/{run_id}", response_model=RunMetadata)
def get_run(run_id: UUID, db: DbSession, project_scope: ProjectScopeDep) -> RunMetadata:
    run = get_run_record(db, project_id=project_scope.project_id, run_id=run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    metrics = get_run_quality_metrics(db, project_id=project_scope.project_id, run_id=run_id)
    return _to_run_metadata(run, metrics=metrics)


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


@router.get("/{run_id}/policy-events", response_model=list[PolicyEventListItem])
def get_run_policy_events(
    run_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[PolicyEventListItem]:
    run = get_run_record(db, project_id=project_scope.project_id, run_id=run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    policy_events = list_policy_events_for_run(
        db,
        project_id=project_scope.project_id,
        run_id=run_id,
        limit=limit,
        offset=offset,
    )
    return [_to_policy_event_list_item(item) for item in policy_events]


@router.post(
    "/{run_id}/apply-template/{template_id}",
    status_code=status.HTTP_201_CREATED,
    response_model=ApplyTemplateRunResponse,
)
def post_apply_template(
    run_id: UUID,
    template_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
) -> ApplyTemplateRunResponse:
    try:
        new_run = apply_template_and_enqueue(
            db,
            project_id=project_scope.project_id,
            run_id=run_id,
            template_id=template_id,
        )
    except TemplateRunNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except TemplateNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return ApplyTemplateRunResponse(new_run_id=new_run.run_id)
