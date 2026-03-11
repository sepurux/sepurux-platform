from __future__ import annotations

from typing import Annotated, Literal, cast
from uuid import UUID

from app.auth import ProjectScope, TenantAuthContext, require_project_scope, require_role
from app.db import get_db
from app.models import PolicyEvent, ReplayAttempt, SecurityEvent
from app.schemas import (
    ApplyTemplateRunResponse,
    PolicyEventListItem,
    ReplayAttemptListItem,
    RunCreateRequest,
    RunMetadata,
    SecurityEventListItem,
)
from app.services.attempt_service import list_attempts_for_run
from app.services.audit_service import actor_from_request
from app.services.campaign_service import get_campaign as get_campaign_record
from app.services.demo_service import enforce_demo_run_limits
from app.services.run_service import (
    RelatedRecordNotFoundError,
    create_run_and_enqueue,
    get_run_quality_metrics,
    list_policy_events_for_run,
    list_recent_runs,
    list_security_events_for_run,
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
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/runs", tags=["runs"])

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]
DeveloperAuth = Annotated[TenantAuthContext, Depends(require_role("developer"))]


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


def _to_security_event_list_item(security_event: SecurityEvent) -> SecurityEventListItem:
    action: Literal["allow", "sanitize", "block"]
    if security_event.action in {"allow", "sanitize", "block"}:
        action = cast(
            Literal["allow", "sanitize", "block"],
            security_event.action,
        )
    else:
        action = "allow"
    return SecurityEventListItem(
        security_event_id=security_event.security_event_id,
        run_id=security_event.run_id,
        attempt_id=security_event.attempt_id,
        event_index=security_event.event_index,
        tool=security_event.tool,
        zone=security_event.zone,
        risk_score=security_event.risk_score,
        action=action,
        matches=security_event.matches,
        created_at=security_event.created_at,
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=RunMetadata)
def post_run(
    payload: RunCreateRequest,
    db: DbSession,
    project_scope: ProjectScopeDep,
    tenant_auth: DeveloperAuth,
    request: Request,
) -> RunMetadata:
    if tenant_auth.is_demo:
        campaign = get_campaign_record(
            db,
            project_id=project_scope.project_id,
            campaign_id=payload.campaign_id,
        )
        if campaign is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
        enforce_demo_run_limits(
            db,
            project_id=project_scope.project_id,
            campaign=campaign,
        )

    try:
        run = create_run_and_enqueue(
            db,
            project_id=project_scope.project_id,
            trace_id=payload.trace_id,
            campaign_id=payload.campaign_id,
            mutation_pack_id=payload.mutation_pack_id,
            policy_pack_id=payload.policy_pack_id,
            actor=actor_from_request(request),
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


@router.get("/{run_id}/security-events", response_model=list[SecurityEventListItem])
def get_run_security_events(
    run_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[SecurityEventListItem]:
    run = get_run_record(db, project_id=project_scope.project_id, run_id=run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    security_events = list_security_events_for_run(
        db,
        project_id=project_scope.project_id,
        run_id=run_id,
        limit=limit,
        offset=offset,
    )
    return [_to_security_event_list_item(item) for item in security_events]


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
    request: Request,
) -> ApplyTemplateRunResponse:
    try:
        new_run = apply_template_and_enqueue(
            db,
            project_id=project_scope.project_id,
            run_id=run_id,
            template_id=template_id,
            actor=actor_from_request(request),
        )
    except TemplateRunNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except TemplateNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return ApplyTemplateRunResponse(new_run_id=new_run.run_id)
