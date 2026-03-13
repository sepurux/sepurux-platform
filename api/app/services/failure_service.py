from __future__ import annotations

from collections import Counter
from typing import Any, Literal, TypedDict
from uuid import UUID

from app.models import Failure
from sqlalchemy import Select, select
from sqlalchemy.orm import Session


class FailureBreakdownItem(TypedDict):
    type: str
    count: int


class CampaignReliabilityResult(TypedDict):
    reliability_score: float
    status: Literal["healthy", "warning", "critical"]
    classified_failures: int
    failure_breakdown: list[FailureBreakdownItem]


def list_failures_for_campaign(
    db: Session,
    *,
    project_id: UUID,
    campaign_id: UUID,
    run_id: UUID | None = None,
    limit: int = 200,
    offset: int = 0,
) -> list[Failure]:
    query = _failure_query(
        project_id=project_id,
        campaign_id=campaign_id,
        run_id=run_id,
    )
    query = query.order_by(Failure.created_at.desc(), Failure.failure_id.desc())
    query = query.limit(limit).offset(offset)
    return list(db.scalars(query))


def calculate_campaign_reliability(
    db: Session,
    *,
    project_id: UUID,
    campaign_id: UUID,
    run_id: UUID | None = None,
) -> CampaignReliabilityResult:
    severity_counts: Counter[str] = Counter()
    failure_breakdown: Counter[str] = Counter()

    for failure in db.scalars(
        _failure_query(project_id=project_id, campaign_id=campaign_id, run_id=run_id)
    ):
        severity_counts[failure.severity] += 1
        failure_breakdown[failure.failure_type] += 1

    score = 100 - (severity_counts.get("critical", 0) * 10)
    score -= severity_counts.get("high", 0) * 5
    score -= severity_counts.get("medium", 0) * 2
    if score < 0:
        score = 0

    status = "healthy"
    if score < 70:
        status = "critical"
    elif score < 90:
        status = "warning"

    breakdown_items: list[FailureBreakdownItem] = [
        {"type": failure_type, "count": count}
        for failure_type, count in sorted(
            failure_breakdown.items(),
            key=lambda item: (-item[1], item[0]),
        )
    ]

    return {
        "reliability_score": float(score),
        "status": cast_status(status),
        "classified_failures": sum(failure_breakdown.values()),
        "failure_breakdown": breakdown_items,
    }


def serialize_failure_record(failure: Failure) -> dict[str, Any]:
    return {
        "failure_id": failure.failure_id,
        "run_id": failure.run_id,
        "campaign_id": failure.campaign_id,
        "trace_id": failure.trace_id,
        "mutation": failure.mutation_name,
        "type": failure.failure_type,
        "severity": failure.severity,
        "description": failure.description,
        "metadata": (
            failure.failure_metadata if isinstance(failure.failure_metadata, dict) else None
        ),
        "created_at": failure.created_at,
    }


def _failure_query(
    *,
    project_id: UUID,
    campaign_id: UUID,
    run_id: UUID | None,
) -> Select[tuple[Failure]]:
    query = select(Failure).where(
        Failure.project_id == project_id,
        Failure.campaign_id == campaign_id,
    )
    if run_id is not None:
        query = query.where(Failure.run_id == run_id)
    return query


def cast_status(status: str) -> Literal["healthy", "warning", "critical"]:
    if status == "critical":
        return "critical"
    if status == "warning":
        return "warning"
    return "healthy"
