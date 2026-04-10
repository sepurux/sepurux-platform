from __future__ import annotations

import logging
from typing import Annotated, Literal, cast
from uuid import UUID

from app.auth import ProjectScope, TenantAuthContext, require_project_scope, require_role
from app.db import get_db
from app.models import PolicyEvent, ReplayAttempt, SecurityEvent, Trace
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
from app.services.billing_service import (
    InsufficientCreditsError,
    get_queue_priority_for_context,
    maybe_consume_credits_for_campaign_run,
    maybe_consume_credits_for_trace_replay,
    operation_cost_for_campaign_record,
    operation_cost_for_template_replay,
    refund_credits_for_context,
)
from app.services.campaign_service import get_campaign as get_campaign_record
from app.services.demo_service import enforce_demo_run_limits
from app.services.mutation_pack_service import get_mutation_pack
from app.services.notification_service import create_notification
from app.services.policy_service import get_policy_pack
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
    get_template,
)
from app.services.tenant_control_service import (
    TenantControlViolationError,
    assert_tenant_runs_allowed,
)
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/runs", tags=["runs"])
logger = logging.getLogger(__name__)

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
    charged_amount: int | None = None
    charged_reason: str | None = None

    try:
        assert_tenant_runs_allowed(db, tenant_id=project_scope.tenant_id)
    except TenantControlViolationError as exc:
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail=str(exc)) from exc

    trace = db.scalar(
        select(Trace).where(
            Trace.trace_id == payload.trace_id,
            Trace.project_id == project_scope.project_id,
        )
    )
    if trace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trace not found")

    campaign = get_campaign_record(
        db,
        project_id=project_scope.project_id,
        campaign_id=payload.campaign_id,
    )
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    if payload.mutation_pack_id is not None and (
        get_mutation_pack(
            db,
            project_id=project_scope.project_id,
            mutation_pack_id=payload.mutation_pack_id,
        )
        is None
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mutation pack not found")

    if payload.policy_pack_id is not None and (
        get_policy_pack(
            db,
            project_id=project_scope.project_id,
            policy_pack_id=payload.policy_pack_id,
        )
        is None
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy pack not found")

    if tenant_auth.is_demo:
        enforce_demo_run_limits(
            db,
            project_id=project_scope.project_id,
            campaign=campaign,
        )
    else:
        try:
            charged_amount, charged_reason = operation_cost_for_campaign_record(campaign)
            maybe_consume_credits_for_campaign_run(
                db,
                tenant_auth=tenant_auth,
                project_id=project_scope.project_id,
                campaign=campaign,
            )
        except InsufficientCreditsError as exc:
            try:
                create_notification(
                    db,
                    tenant_id=project_scope.tenant_id,
                    project_id=project_scope.project_id,
                    user_id=tenant_auth.user_id,
                    event_type="credits.insufficient",
                    severity="warning",
                    title="Run blocked: insufficient credits",
                    message=(
                        f"Campaign '{campaign.name}' could not start because available "
                        "credits are below required minimum."
                    ),
                    link_url="/billing",
                    metadata={"campaign_id": str(campaign.campaign_id)},
                )
            except Exception:
                logger.exception("Failed to create insufficient-credits notification")
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=str(exc)
            ) from exc

    queue_priority = get_queue_priority_for_context(
        db,
        tenant_auth=tenant_auth,
        project_id=project_scope.project_id,
    )

    try:
        run = create_run_and_enqueue(
            db,
            project_id=project_scope.project_id,
            trace_id=payload.trace_id,
            campaign_id=payload.campaign_id,
            mutation_pack_id=payload.mutation_pack_id,
            policy_pack_id=payload.policy_pack_id,
            queue_priority=queue_priority,
            actor=actor_from_request(request),
        )
    except RelatedRecordNotFoundError as exc:
        if charged_amount is not None and charged_reason is not None:
            try:
                refund_credits_for_context(
                    db,
                    tenant_auth=tenant_auth,
                    project_id=project_scope.project_id,
                    amount=charged_amount,
                    reason=f"refund:{charged_reason}:run_creation_failed",
                )
            except Exception:
                logger.exception("Failed to refund credits after run creation failure")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except TenantControlViolationError as exc:
        if charged_amount is not None and charged_reason is not None:
            try:
                refund_credits_for_context(
                    db,
                    tenant_auth=tenant_auth,
                    project_id=project_scope.project_id,
                    amount=charged_amount,
                    reason=f"refund:{charged_reason}:tenant_runs_paused",
                )
            except Exception:
                logger.exception("Failed to refund credits after tenant run lock")
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail=str(exc)) from exc
    except Exception:
        if charged_amount is not None and charged_reason is not None:
            try:
                refund_credits_for_context(
                    db,
                    tenant_auth=tenant_auth,
                    project_id=project_scope.project_id,
                    amount=charged_amount,
                    reason=f"refund:{charged_reason}:enqueue_failed",
                )
            except Exception:
                logger.exception("Failed to refund credits after enqueue failure")
        raise

    try:
        create_notification(
            db,
            tenant_id=project_scope.tenant_id,
            project_id=project_scope.project_id,
            user_id=tenant_auth.user_id,
            event_type="run.queued",
            severity="info",
            title="Run queued",
            message=(
                f"Campaign '{campaign.name}' was queued successfully and is waiting for execution."
            ),
            link_url=f"/runs/{run.run_id}",
            metadata={
                "run_id": str(run.run_id),
                "campaign_id": str(run.campaign_id),
                "trace_id": str(run.trace_id),
            },
        )
    except Exception:
        logger.exception("Failed to create run queued notification")

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
    offset: int = Query(0, ge=0),
    status: str | None = Query(None),
) -> list[RunMetadata]:
    return [
        _to_run_metadata(run)
        for run in list_recent_runs(
            db,
            project_id=project_scope.project_id,
            limit=limit,
            offset=offset,
            status=status,
        )
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
    tenant_auth: DeveloperAuth,
    request: Request,
) -> ApplyTemplateRunResponse:
    charged_amount: int | None = None
    charged_reason: str | None = None

    try:
        assert_tenant_runs_allowed(db, tenant_id=project_scope.tenant_id)
    except TenantControlViolationError as exc:
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail=str(exc)) from exc

    source_run = get_run_record(db, project_id=project_scope.project_id, run_id=run_id)
    if source_run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    template = get_template(db, project_id=project_scope.project_id, template_id=template_id)
    if template is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    _ = template

    if not tenant_auth.is_demo:
        try:
            charged_amount, charged_reason = operation_cost_for_template_replay()
            maybe_consume_credits_for_trace_replay(
                db,
                tenant_auth=tenant_auth,
                project_id=project_scope.project_id,
            )
        except InsufficientCreditsError as exc:
            try:
                create_notification(
                    db,
                    tenant_id=project_scope.tenant_id,
                    project_id=project_scope.project_id,
                    user_id=tenant_auth.user_id,
                    event_type="credits.insufficient",
                    severity="warning",
                    title="Replay blocked: insufficient credits",
                    message="Template replay was blocked because available credits are too low.",
                    link_url="/billing",
                    metadata={"source_run_id": str(source_run.run_id)},
                )
            except Exception:
                logger.exception("Failed to create replay insufficient-credits notification")
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=str(exc)
            ) from exc

    queue_priority = get_queue_priority_for_context(
        db,
        tenant_auth=tenant_auth,
        project_id=project_scope.project_id,
    )

    try:
        new_run = apply_template_and_enqueue(
            db,
            project_id=project_scope.project_id,
            run_id=source_run.run_id,
            template_id=template_id,
            queue_priority=queue_priority,
            actor=actor_from_request(request),
        )
    except TemplateRunNotFoundError as exc:
        if charged_amount is not None and charged_reason is not None:
            try:
                refund_credits_for_context(
                    db,
                    tenant_auth=tenant_auth,
                    project_id=project_scope.project_id,
                    amount=charged_amount,
                    reason=f"refund:{charged_reason}:template_source_missing",
                )
            except Exception:
                logger.exception("Failed to refund credits after template source run failure")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except TemplateNotFoundError as exc:
        if charged_amount is not None and charged_reason is not None:
            try:
                refund_credits_for_context(
                    db,
                    tenant_auth=tenant_auth,
                    project_id=project_scope.project_id,
                    amount=charged_amount,
                    reason=f"refund:{charged_reason}:template_missing",
                )
            except Exception:
                logger.exception("Failed to refund credits after template lookup failure")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except RelatedRecordNotFoundError as exc:
        if charged_amount is not None and charged_reason is not None:
            try:
                refund_credits_for_context(
                    db,
                    tenant_auth=tenant_auth,
                    project_id=project_scope.project_id,
                    amount=charged_amount,
                    reason=f"refund:{charged_reason}:template_related_record_missing",
                )
            except Exception:
                logger.exception("Failed to refund credits after template related-record failure")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        if charged_amount is not None and charged_reason is not None:
            try:
                refund_credits_for_context(
                    db,
                    tenant_auth=tenant_auth,
                    project_id=project_scope.project_id,
                    amount=charged_amount,
                    reason=f"refund:{charged_reason}:template_validation_failed",
                )
            except Exception:
                logger.exception("Failed to refund credits after template validation failure")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except TenantControlViolationError as exc:
        if charged_amount is not None and charged_reason is not None:
            try:
                refund_credits_for_context(
                    db,
                    tenant_auth=tenant_auth,
                    project_id=project_scope.project_id,
                    amount=charged_amount,
                    reason=f"refund:{charged_reason}:tenant_runs_paused",
                )
            except Exception:
                logger.exception("Failed to refund credits after tenant run lock")
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail=str(exc)) from exc
    except Exception:
        if charged_amount is not None and charged_reason is not None:
            try:
                refund_credits_for_context(
                    db,
                    tenant_auth=tenant_auth,
                    project_id=project_scope.project_id,
                    amount=charged_amount,
                    reason=f"refund:{charged_reason}:template_enqueue_failed",
                )
            except Exception:
                logger.exception("Failed to refund credits after template enqueue failure")
        raise

    try:
        create_notification(
            db,
            tenant_id=project_scope.tenant_id,
            project_id=project_scope.project_id,
            user_id=tenant_auth.user_id,
            event_type="run.replay_queued",
            severity="info",
            title="Template replay queued",
            message="A new replay run was queued from your selected hardening template.",
            link_url=f"/runs/{new_run.run_id}",
            metadata={
                "new_run_id": str(new_run.run_id),
                "source_run_id": str(source_run.run_id),
                "template_id": str(template_id),
            },
        )
    except Exception:
        logger.exception("Failed to create replay queued notification")

    return ApplyTemplateRunResponse(new_run_id=new_run.run_id)
