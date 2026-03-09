from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

from app.models import ApiKey, Campaign, Project, Run, Trace
from app.services.api_key_service import create_api_key_for_tenant
from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

DEMO_API_KEY_PLAINTEXT = "demo_sepurux_key"
DEMO_PROJECT_NAME = "Sepurux Demo Project"
DEMO_CAMPAIGN_NAME = "demo_campaign"
DEMO_MUTATION_PACK_NAME = "core.demo"
DEMO_RECOMMENDED_FLOW = "session"

DEMO_MAX_CAMPAIGNS_PER_HOUR = 3
DEMO_MAX_MUTATIONS_PER_RUN = 20
DEMO_MAX_TRACES_UPLOAD_PER_HOUR = 10
DEMO_MAX_TRACE_BYTES = 256_000
DEMO_SESSION_TTL_MINUTES = 180
DEMO_SESSION_RATE_LIMIT_PER_MINUTE = 90
DEMO_SESSION_NAME_PREFIX = "demo-session:"
DEMO_MAX_SESSION_ISSUES_PER_10_MIN = 500


def demo_info_payload() -> dict[str, Any]:
    return {
        "demo_api_key": DEMO_API_KEY_PLAINTEXT,
        "demo_campaign": DEMO_CAMPAIGN_NAME,
        "recommended_flow": DEMO_RECOMMENDED_FLOW,
        "session_ttl_minutes": DEMO_SESSION_TTL_MINUTES,
        "limits": {
            "campaigns_per_hour": DEMO_MAX_CAMPAIGNS_PER_HOUR,
            "mutations_per_run": DEMO_MAX_MUTATIONS_PER_RUN,
            "traces_upload_per_hour": DEMO_MAX_TRACES_UPLOAD_PER_HOUR,
            "max_trace_bytes": DEMO_MAX_TRACE_BYTES,
        },
    }


def create_demo_session(db: Session) -> dict[str, Any]:
    now = datetime.now(UTC)
    _cleanup_stale_demo_session_keys(db, now=now)
    _enforce_demo_session_issuance_limit(db, now=now)

    project = _get_demo_project(db)
    session_name = f"{DEMO_SESSION_NAME_PREFIX}{uuid4().hex[:12]}"
    _, plaintext = create_api_key_for_tenant(
        db,
        tenant_id=project.tenant_id,
        project_id=project.project_id,
        user_id=project.owner_id,
        name=session_name,
        is_demo=True,
        rate_limit_per_minute=DEMO_SESSION_RATE_LIMIT_PER_MINUTE,
    )

    return {
        "api_key": plaintext,
        "project_id": project.project_id,
        "project_name": project.name,
        "demo_campaign": DEMO_CAMPAIGN_NAME,
        "demo_mutation_pack": DEMO_MUTATION_PACK_NAME,
        "expires_at": now + timedelta(minutes=DEMO_SESSION_TTL_MINUTES),
        "rate_limit_per_minute": DEMO_SESSION_RATE_LIMIT_PER_MINUTE,
        "limits": demo_info_payload()["limits"],
    }


def _get_demo_project(db: Session) -> Project:
    project = db.scalar(
        select(Project)
        .where(Project.name == DEMO_PROJECT_NAME)
        .order_by(Project.created_at.desc(), Project.project_id.desc())
    )
    if not isinstance(project, Project):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Demo environment is not available",
        )
    return project


def _cleanup_stale_demo_session_keys(db: Session, *, now: datetime) -> None:
    cutoff = now - timedelta(minutes=DEMO_SESSION_TTL_MINUTES)
    db.execute(
        delete(ApiKey).where(
            ApiKey.is_demo.is_(True),
            ApiKey.name.like(f"{DEMO_SESSION_NAME_PREFIX}%"),
            ApiKey.created_at < cutoff,
        )
    )


def _enforce_demo_session_issuance_limit(db: Session, *, now: datetime) -> None:
    window_start = now - timedelta(minutes=10)
    issued_count = db.scalar(
        select(func.count())
        .select_from(ApiKey)
        .where(
            ApiKey.is_demo.is_(True),
            ApiKey.name.like(f"{DEMO_SESSION_NAME_PREFIX}%"),
            ApiKey.created_at >= window_start,
        )
    )
    if int(issued_count or 0) >= DEMO_MAX_SESSION_ISSUES_PER_10_MIN:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demo is currently saturated. Retry in a few minutes.",
        )


def enforce_demo_campaign_create_limit(
    db: Session,
    *,
    project_id: UUID,
) -> None:
    window_start = datetime.now(UTC) - timedelta(hours=1)
    count = db.scalar(
        select(func.count())
        .select_from(Campaign)
        .where(
            Campaign.project_id == project_id,
            Campaign.created_at >= window_start,
        )
    )
    if int(count or 0) >= DEMO_MAX_CAMPAIGNS_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demo limit reached: max campaigns per hour exceeded",
        )


def enforce_demo_trace_upload_limits(
    db: Session,
    *,
    project_id: UUID,
    payload: Any,
) -> None:
    window_start = datetime.now(UTC) - timedelta(hours=1)
    count = db.scalar(
        select(func.count())
        .select_from(Trace)
        .where(
            Trace.project_id == project_id,
            Trace.created_at >= window_start,
        )
    )
    if int(count or 0) >= DEMO_MAX_TRACES_UPLOAD_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demo limit reached: max trace uploads per hour exceeded",
        )

    payload_size = len(json.dumps(payload, ensure_ascii=False).encode("utf-8"))
    if payload_size > DEMO_MAX_TRACE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Demo limit reached: trace payload is too large",
        )


def enforce_demo_run_limits(
    db: Session,
    *,
    project_id: UUID,
    campaign: Campaign,
) -> None:
    mutation_count = estimate_mutation_count(campaign.mutation_set)
    if mutation_count > DEMO_MAX_MUTATIONS_PER_RUN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Demo limit reached: max mutations per run exceeded",
        )

    window_start = datetime.now(UTC) - timedelta(hours=1)
    run_count = db.scalar(
        select(func.count())
        .select_from(Run)
        .where(
            Run.project_id == project_id,
            Run.campaign_id == campaign.campaign_id,
            Run.created_at >= window_start,
        )
    )
    if int(run_count or 0) >= DEMO_MAX_CAMPAIGNS_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demo limit reached: max campaign runs per hour exceeded",
        )


def estimate_mutation_count(mutation_set: Any) -> int:
    if isinstance(mutation_set, list):
        return len(mutation_set)
    if isinstance(mutation_set, dict):
        nested = mutation_set.get("mutations")
        if isinstance(nested, list):
            return len(nested)
        return 1
    if mutation_set is None:
        return 0
    return 1
