from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated

from app.auth import TenantAuthContext, require_super_admin
from app.db import get_db
from app.models import AuditLog, Campaign, CreditTransaction, Failure, Project, Run, User
from app.schemas import (
    InternalAuditLogEntry,
    InternalDashboardOverview,
    InternalSearchCampaignResult,
    InternalSearchFailureResult,
    InternalSearchProjectResult,
    InternalSearchResults,
    InternalSearchUserResult,
    InternalSystemHealth,
)
from app.services.internal_audit_service import create_audit_log
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
