from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from app.auth import TenantAuthContext, require_super_admin
from app.db import get_db
from app.models import AuditLog, Campaign, CreditTransaction, Failure, Project, Run, User
from app.schemas import (
    InternalAlertItem,
    InternalAlertNotificationResponse,
    InternalAnalyticsOverview,
    InternalAuditLogEntry,
    InternalBillingAdjustmentRequest,
    InternalBillingAdjustmentResponse,
    InternalBillingTransactionEntry,
    InternalBillingWalletEntry,
    InternalDashboardOverview,
    InternalFeatureFlags,
    InternalFeatureFlagsUpdate,
    InternalQueueActionRequest,
    InternalQueueActionResponse,
    InternalQueueOverview,
    InternalSearchCampaignResult,
    InternalSearchFailureResult,
    InternalSearchProjectResult,
    InternalSearchResults,
    InternalSearchUserResult,
    InternalSystemHealth,
    InternalSystemOverview,
    InternalTenantApiKeyRevokeRequest,
    InternalTenantApiKeyRevokeResponse,
    InternalTenantControls,
    InternalTenantControlsUpdateRequest,
    InternalTimeSeriesMetrics,
)
from app.services.internal_alert_service import evaluate_internal_alerts, notify_internal_alerts
from app.services.internal_analytics_service import build_internal_analytics
from app.services.internal_audit_service import create_audit_log
from app.services.internal_billing_service import (
    adjust_internal_credits,
    list_internal_transactions,
    list_internal_wallets,
)
from app.services.internal_queue_service import (
    cancel_queue_job,
    get_internal_queue_overview,
    retry_queue_job,
)
from app.services.internal_settings_service import (
    get_internal_feature_flags,
    update_internal_feature_flags,
)
from app.services.internal_system_service import build_internal_system_overview
from app.services.internal_time_series_service import build_internal_time_series
from app.services.tenant_control_service import (
    get_or_create_tenant_controls,
    revoke_tenant_api_keys,
    update_tenant_controls,
)
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

RUNNING_RUN_STATUSES = {"queued", "running", "in_progress", "pending"}
SEARCH_RESULT_LIMIT = 20

router = APIRouter(prefix="/v1/internal", tags=["internal"], include_in_schema=False)

DbSession = Annotated[Session, Depends(get_db)]
SuperAdminDep = Annotated[TenantAuthContext, Depends(require_super_admin)]


def _coerce_int(value: object) -> int:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    return 0


def _system_health_snapshot() -> InternalSystemHealth:
    try:
        from app.queue import (
            DEFAULT_RUN_QUEUE_NAME,
            PRIORITY_RUN_QUEUE_NAME,
            get_redis_connection,
        )
        from rq import Queue, Worker

        redis_connection = get_redis_connection()
        default_queue = Queue(DEFAULT_RUN_QUEUE_NAME, connection=redis_connection)
        priority_queue = Queue(PRIORITY_RUN_QUEUE_NAME, connection=redis_connection)
        queue_backlog = int(default_queue.count) + int(priority_queue.count)
        worker_count = len(Worker.all(connection=redis_connection))
        if worker_count > 0:
            return InternalSystemHealth(
                status="healthy",
                worker_status="online",
                queue_backlog=queue_backlog,
            )
        return InternalSystemHealth(
            status="degraded",
            worker_status="offline",
            queue_backlog=queue_backlog,
        )
    except Exception:
        return InternalSystemHealth(
            status="unknown",
            worker_status="unknown",
            queue_backlog=0,
        )


def _actor_label(db: Session, tenant_auth: TenantAuthContext) -> str:
    if tenant_auth.user_id is None:
        return tenant_auth.api_key_name or str(tenant_auth.api_key_id)

    user = db.scalar(select(User).where(User.user_id == tenant_auth.user_id))
    if isinstance(user, User):
        return user.email
    return str(tenant_auth.user_id)


def _serialize_tenant_controls(controls) -> InternalTenantControls:
    return InternalTenantControls(
        tenant_id=controls.tenant_id,
        runs_paused=bool(controls.runs_paused),
        workspace_creation_locked=bool(controls.workspace_creation_locked),
        updated_by=controls.updated_by,
        reason=controls.reason,
        updated_at=controls.updated_at,
    )


@router.get("/dashboard", response_model=InternalDashboardOverview)
def get_internal_dashboard_overview(
    db: DbSession,
    super_admin: SuperAdminDep,
) -> InternalDashboardOverview:
    failures_since = datetime.now(UTC) - timedelta(hours=24)

    total_users = _coerce_int(db.scalar(select(func.count()).select_from(User)))
    active_projects = _coerce_int(db.scalar(select(func.count()).select_from(Project)))
    running_campaigns = _coerce_int(
        db.scalar(
            select(func.count())
            .select_from(Run)
            .where(Run.status.in_(sorted(RUNNING_RUN_STATUSES)))
        )
    )
    failures_last_24h = _coerce_int(
        db.scalar(
            select(func.count()).select_from(Failure).where(Failure.created_at >= failures_since)
        )
    )

    credits_used_raw = _coerce_int(
        db.scalar(
            select(func.coalesce(func.sum(CreditTransaction.amount), 0)).where(
                CreditTransaction.amount < 0
            )
        )
    )

    payload = InternalDashboardOverview(
        total_users=total_users,
        active_projects=active_projects,
        running_campaigns=running_campaigns,
        failures_last_24h=failures_last_24h,
        credits_used=abs(credits_used_raw),
        system_health=_system_health_snapshot(),
    )
    create_audit_log(
        db,
        action="internal.dashboard.view",
        actor=_actor_label(db, super_admin),
        entity="internal.dashboard",
        metadata={},
    )
    db.commit()
    return payload


@router.get("/search", response_model=InternalSearchResults)
def search_internal(
    db: DbSession,
    super_admin: SuperAdminDep,
    q: Annotated[str, Query(min_length=1)],
) -> InternalSearchResults:
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    pattern = f"%{query}%"

    users = list(
        db.scalars(
            select(User)
            .where(or_(User.email.ilike(pattern), User.name.ilike(pattern)))
            .order_by(User.created_at.desc())
            .limit(SEARCH_RESULT_LIMIT)
        )
    )
    projects = list(
        db.scalars(
            select(Project)
            .where(Project.name.ilike(pattern))
            .order_by(Project.created_at.desc())
            .limit(SEARCH_RESULT_LIMIT)
        )
    )
    campaigns = list(
        db.scalars(
            select(Campaign)
            .where(Campaign.name.ilike(pattern))
            .order_by(Campaign.created_at.desc())
            .limit(SEARCH_RESULT_LIMIT)
        )
    )
    failures = list(
        db.scalars(
            select(Failure)
            .where(
                or_(
                    Failure.description.ilike(pattern),
                    Failure.failure_type.ilike(pattern),
                    Failure.mutation_name.ilike(pattern),
                )
            )
            .order_by(Failure.created_at.desc())
            .limit(SEARCH_RESULT_LIMIT)
        )
    )

    payload = InternalSearchResults(
        query=query,
        users=[
            InternalSearchUserResult(
                user_id=user.user_id,
                email=user.email,
                name=user.name,
                created_at=user.created_at,
            )
            for user in users
        ],
        projects=[
            InternalSearchProjectResult(
                project_id=project.project_id,
                tenant_id=project.tenant_id,
                name=project.name,
                created_at=project.created_at,
            )
            for project in projects
        ],
        campaigns=[
            InternalSearchCampaignResult(
                campaign_id=campaign.campaign_id,
                project_id=campaign.project_id,
                name=campaign.name,
                status=campaign.status,
                created_at=campaign.created_at,
            )
            for campaign in campaigns
        ],
        failures=[
            InternalSearchFailureResult(
                failure_id=failure.failure_id,
                project_id=failure.project_id,
                run_id=failure.run_id,
                campaign_id=failure.campaign_id,
                mutation_name=failure.mutation_name,
                failure_type=failure.failure_type,
                description=failure.description,
                created_at=failure.created_at,
            )
            for failure in failures
        ],
    )
    create_audit_log(
        db,
        action="internal.search",
        actor=_actor_label(db, super_admin),
        entity="internal.search",
        metadata={"query": query},
    )
    db.commit()
    return payload


@router.get("/audit-logs", response_model=list[InternalAuditLogEntry])
def list_internal_audit_logs(
    db: DbSession,
    super_admin: SuperAdminDep,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    action: str | None = None,
    actor: str | None = None,
    entity: str | None = None,
) -> list[InternalAuditLogEntry]:
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc(), AuditLog.id.desc())

    if action:
        stmt = stmt.where(AuditLog.action.ilike(f"%{action.strip()}%"))
    if actor:
        stmt = stmt.where(AuditLog.actor.ilike(f"%{actor.strip()}%"))
    if entity:
        stmt = stmt.where(AuditLog.entity.ilike(f"%{entity.strip()}%"))

    records = list(db.scalars(stmt.offset(offset).limit(limit)))
    payload = [
        InternalAuditLogEntry(
            id=record.id,
            action=record.action,
            actor=record.actor,
            entity=record.entity,
            metadata=record.audit_metadata if isinstance(record.audit_metadata, dict) else {},
            created_at=record.created_at,
        )
        for record in records
    ]

    create_audit_log(
        db,
        action="internal.audit_logs.view",
        actor=_actor_label(db, super_admin),
        entity="internal.audit_logs",
        metadata={"limit": limit, "offset": offset},
    )
    db.commit()
    return payload


@router.get("/alerts", response_model=list[InternalAlertItem])
def list_internal_alerts(
    db: DbSession,
    super_admin: SuperAdminDep,
) -> list[InternalAlertItem]:
    alerts = evaluate_internal_alerts(db)
    create_audit_log(
        db,
        action="internal.alerts.view",
        actor=_actor_label(db, super_admin),
        entity="internal.alerts",
        metadata={"alerts_count": len(alerts)},
    )
    db.commit()
    return alerts


@router.post("/alerts/notify", response_model=InternalAlertNotificationResponse)
def notify_internal_alert_channels(
    db: DbSession,
    super_admin: SuperAdminDep,
) -> InternalAlertNotificationResponse:
    alerts = evaluate_internal_alerts(db)
    notifications = notify_internal_alerts(alerts)
    payload = InternalAlertNotificationResponse(
        alerts_count=len(alerts),
        notifications=notifications,
    )
    create_audit_log(
        db,
        action="internal.alerts.notify",
        actor=_actor_label(db, super_admin),
        entity="internal.alerts",
        metadata={
            "alerts_count": len(alerts),
            "notifications": [item.model_dump() for item in notifications],
        },
    )
    db.commit()
    return payload


@router.get("/analytics", response_model=InternalAnalyticsOverview)
def get_internal_analytics(
    db: DbSession,
    super_admin: SuperAdminDep,
) -> InternalAnalyticsOverview:
    payload = build_internal_analytics(db)
    create_audit_log(
        db,
        action="internal.analytics.view",
        actor=_actor_label(db, super_admin),
        entity="internal.analytics",
        metadata={},
    )
    db.commit()
    return payload


@router.get("/analytics/time-series", response_model=InternalTimeSeriesMetrics)
def get_internal_analytics_time_series(
    db: DbSession,
    super_admin: SuperAdminDep,
    days: Annotated[int, Query(ge=7, le=90)] = 14,
) -> InternalTimeSeriesMetrics:
    payload = build_internal_time_series(db, window_days=days)
    create_audit_log(
        db,
        action="internal.analytics.time_series.view",
        actor=_actor_label(db, super_admin),
        entity="internal.analytics.time_series",
        metadata={"window_days": payload.window_days},
    )
    db.commit()
    return payload


@router.get("/queues", response_model=InternalQueueOverview)
def get_internal_queues(
    db: DbSession,
    super_admin: SuperAdminDep,
) -> InternalQueueOverview:
    payload = get_internal_queue_overview()
    create_audit_log(
        db,
        action="internal.queues.view",
        actor=_actor_label(db, super_admin),
        entity="internal.queues",
        metadata={
            "jobs_running": payload.jobs_running,
            "jobs_failed": payload.jobs_failed,
            "queue_backlog": payload.queue_backlog,
        },
    )
    db.commit()
    return payload


@router.post("/queues/retry", response_model=InternalQueueActionResponse)
def post_internal_queue_retry(
    payload: InternalQueueActionRequest,
    db: DbSession,
    super_admin: SuperAdminDep,
) -> InternalQueueActionResponse:
    result = retry_queue_job(payload.job_id)
    create_audit_log(
        db,
        action="internal.queues.retry",
        actor=_actor_label(db, super_admin),
        entity=f"queue-job:{payload.job_id}",
        metadata=result.model_dump(),
    )
    db.commit()
    return result


@router.post("/queues/cancel", response_model=InternalQueueActionResponse)
def post_internal_queue_cancel(
    payload: InternalQueueActionRequest,
    db: DbSession,
    super_admin: SuperAdminDep,
) -> InternalQueueActionResponse:
    result = cancel_queue_job(payload.job_id)
    create_audit_log(
        db,
        action="internal.queues.cancel",
        actor=_actor_label(db, super_admin),
        entity=f"queue-job:{payload.job_id}",
        metadata=result.model_dump(),
    )
    db.commit()
    return result


@router.get("/billing/wallets", response_model=list[InternalBillingWalletEntry])
def get_internal_billing_wallets(
    db: DbSession,
    super_admin: SuperAdminDep,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[InternalBillingWalletEntry]:
    payload = list_internal_wallets(db, limit=limit, offset=offset)
    create_audit_log(
        db,
        action="internal.billing.wallets.view",
        actor=_actor_label(db, super_admin),
        entity="internal.billing.wallets",
        metadata={"limit": limit, "offset": offset},
    )
    db.commit()
    return payload


@router.get("/billing/transactions", response_model=list[InternalBillingTransactionEntry])
def get_internal_billing_transactions(
    db: DbSession,
    super_admin: SuperAdminDep,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[InternalBillingTransactionEntry]:
    payload = list_internal_transactions(db, limit=limit, offset=offset)
    create_audit_log(
        db,
        action="internal.billing.transactions.view",
        actor=_actor_label(db, super_admin),
        entity="internal.billing.transactions",
        metadata={"limit": limit, "offset": offset},
    )
    db.commit()
    return payload


@router.post("/billing/adjust", response_model=InternalBillingAdjustmentResponse)
def post_internal_billing_adjust(
    payload: InternalBillingAdjustmentRequest,
    db: DbSession,
    super_admin: SuperAdminDep,
) -> InternalBillingAdjustmentResponse:
    try:
        result = adjust_internal_credits(
            db,
            user_id=payload.user_id,
            amount=payload.amount,
            reason=payload.reason,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    create_audit_log(
        db,
        action="internal.billing.adjust",
        actor=_actor_label(db, super_admin),
        entity=f"user:{payload.user_id}",
        metadata={
            "amount": payload.amount,
            "reason": payload.reason,
            "transaction_id": str(result.transaction.credit_transaction_id),
        },
    )
    db.commit()
    return result


@router.get("/system", response_model=InternalSystemOverview)
def get_internal_system_overview(
    db: DbSession,
    super_admin: SuperAdminDep,
) -> InternalSystemOverview:
    payload = build_internal_system_overview(db)
    create_audit_log(
        db,
        action="internal.system.view",
        actor=_actor_label(db, super_admin),
        entity="internal.system",
        metadata=payload.model_dump(),
    )
    db.commit()
    return payload


@router.get("/settings", response_model=InternalFeatureFlags)
def get_internal_settings(
    db: DbSession,
    super_admin: SuperAdminDep,
) -> InternalFeatureFlags:
    payload = get_internal_feature_flags(db)
    create_audit_log(
        db,
        action="internal.settings.view",
        actor=_actor_label(db, super_admin),
        entity="internal.settings",
        metadata=payload.model_dump(),
    )
    db.commit()
    return payload


@router.put("/settings", response_model=InternalFeatureFlags)
def put_internal_settings(
    body: InternalFeatureFlagsUpdate,
    db: DbSession,
    super_admin: SuperAdminDep,
) -> InternalFeatureFlags:
    payload = update_internal_feature_flags(db, body)
    create_audit_log(
        db,
        action="internal.settings.update",
        actor=_actor_label(db, super_admin),
        entity="internal.settings",
        metadata=payload.model_dump(),
    )
    db.commit()
    return payload


@router.get("/tenants/{tenant_id}/controls", response_model=InternalTenantControls)
def get_internal_tenant_controls(
    tenant_id: UUID,
    db: DbSession,
    super_admin: SuperAdminDep,
) -> InternalTenantControls:
    try:
        controls = get_or_create_tenant_controls(db, tenant_id=tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    payload = _serialize_tenant_controls(controls)
    create_audit_log(
        db,
        action="internal.tenants.controls.view",
        actor=_actor_label(db, super_admin),
        entity=f"tenant:{tenant_id}",
        metadata=payload.model_dump(mode="json"),
    )
    db.commit()
    return payload


@router.patch("/tenants/{tenant_id}/controls", response_model=InternalTenantControls)
def patch_internal_tenant_controls(
    tenant_id: UUID,
    body: InternalTenantControlsUpdateRequest,
    db: DbSession,
    super_admin: SuperAdminDep,
) -> InternalTenantControls:
    if body.runs_paused is None and body.workspace_creation_locked is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "At least one control value must be provided "
                "(runs_paused or workspace_creation_locked)."
            ),
        )

    try:
        controls = update_tenant_controls(
            db,
            tenant_id=tenant_id,
            runs_paused=body.runs_paused,
            workspace_creation_locked=body.workspace_creation_locked,
            updated_by=_actor_label(db, super_admin),
            reason=body.reason,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    payload = _serialize_tenant_controls(controls)
    create_audit_log(
        db,
        action="internal.tenants.controls.update",
        actor=_actor_label(db, super_admin),
        entity=f"tenant:{tenant_id}",
        metadata={
            "runs_paused": payload.runs_paused,
            "workspace_creation_locked": payload.workspace_creation_locked,
            "reason": payload.reason,
        },
    )
    db.commit()
    return payload


@router.post(
    "/tenants/{tenant_id}/controls/revoke-api-keys",
    response_model=InternalTenantApiKeyRevokeResponse,
)
def post_internal_tenant_revoke_api_keys(
    tenant_id: UUID,
    body: InternalTenantApiKeyRevokeRequest,
    db: DbSession,
    super_admin: SuperAdminDep,
) -> InternalTenantApiKeyRevokeResponse:
    try:
        revoked_count = revoke_tenant_api_keys(db, tenant_id=tenant_id)
        controls = update_tenant_controls(
            db,
            tenant_id=tenant_id,
            updated_by=_actor_label(db, super_admin),
            reason=body.reason,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    payload = InternalTenantApiKeyRevokeResponse(
        tenant_id=tenant_id,
        revoked_count=revoked_count,
        controls=_serialize_tenant_controls(controls),
    )
    create_audit_log(
        db,
        action="internal.tenants.api_keys.revoke",
        actor=_actor_label(db, super_admin),
        entity=f"tenant:{tenant_id}",
        metadata={
            "revoked_count": revoked_count,
            "reason": body.reason,
        },
    )
    db.commit()
    return payload
