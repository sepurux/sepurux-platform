from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from app.models import Campaign, Run, Trace
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

DEMO_API_KEY_PLAINTEXT = "demo_sepurux_key"
DEMO_PROJECT_NAME = "Sepurux Demo Project"
DEMO_CAMPAIGN_NAME = "demo_campaign"
DEMO_MUTATION_PACK_NAME = "core.demo"

DEMO_MAX_CAMPAIGNS_PER_HOUR = 3
DEMO_MAX_MUTATIONS_PER_RUN = 20
DEMO_MAX_TRACES_UPLOAD_PER_HOUR = 10
DEMO_MAX_TRACE_BYTES = 256_000


def demo_info_payload() -> dict[str, Any]:
    return {
        "demo_api_key": DEMO_API_KEY_PLAINTEXT,
        "demo_campaign": DEMO_CAMPAIGN_NAME,
        "limits": {
            "campaigns_per_hour": DEMO_MAX_CAMPAIGNS_PER_HOUR,
            "mutations_per_run": DEMO_MAX_MUTATIONS_PER_RUN,
            "traces_upload_per_hour": DEMO_MAX_TRACES_UPLOAD_PER_HOUR,
            "max_trace_bytes": DEMO_MAX_TRACE_BYTES,
        },
    }


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
