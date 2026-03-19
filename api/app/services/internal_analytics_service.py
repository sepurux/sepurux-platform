from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Literal

from app.models import ApiKey, CreditTransaction, Failure, Project, Run, User
from app.schemas import (
    InternalAnalyticsOverview,
    InternalFailureTrend,
    InternalProjectAnalyticsEntry,
)
from sqlalchemy import desc, distinct, func, select
from sqlalchemy.orm import Session


def _coerce_int(value: object) -> int:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    return 0


def build_internal_analytics(
    db: Session,
    *,
    now: datetime | None = None,
) -> InternalAnalyticsOverview:
    current_time = now or datetime.now(UTC)
    thirty_days_ago = current_time - timedelta(days=30)
    twenty_four_hours_ago = current_time - timedelta(hours=24)
    forty_eight_hours_ago = current_time - timedelta(hours=48)

    active_users = _coerce_int(
        db.scalar(
            select(func.count(distinct(ApiKey.user_id))).where(
                ApiKey.user_id.is_not(None),
                ApiKey.last_used_at.is_not(None),
                ApiKey.last_used_at >= thirty_days_ago,
            )
        )
    )
    if active_users == 0:
        active_users = _coerce_int(db.scalar(select(func.count()).select_from(User)))

    credits_used_raw = _coerce_int(
        db.scalar(
            select(func.coalesce(func.sum(CreditTransaction.amount), 0)).where(
                CreditTransaction.amount < 0,
                CreditTransaction.created_at >= thirty_days_ago,
            )
        )
    )

    run_counts_subquery = (
        select(
            Run.project_id.label("project_id"),
            func.count().label("runs_count"),
        )
        .where(Run.created_at >= thirty_days_ago)
        .group_by(Run.project_id)
        .subquery()
    )
    failure_counts_subquery = (
        select(
            Failure.project_id.label("project_id"),
            func.count().label("failures_count"),
        )
        .where(Failure.created_at >= thirty_days_ago)
        .group_by(Failure.project_id)
        .subquery()
    )

    top_project_rows = db.execute(
        select(
            Project.project_id,
            Project.name,
            func.coalesce(run_counts_subquery.c.runs_count, 0).label("runs_count"),
            func.coalesce(failure_counts_subquery.c.failures_count, 0).label("failures_count"),
        )
        .outerjoin(run_counts_subquery, run_counts_subquery.c.project_id == Project.project_id)
        .outerjoin(
            failure_counts_subquery,
            failure_counts_subquery.c.project_id == Project.project_id,
        )
        .order_by(
            desc("runs_count"),
            desc("failures_count"),
            Project.name.asc(),
        )
        .limit(5)
    ).all()

    top_projects = [
        InternalProjectAnalyticsEntry(
            project_id=row.project_id,
            name=row.name,
            runs_count=_coerce_int(row.runs_count),
            failures_count=_coerce_int(row.failures_count),
        )
        for row in top_project_rows
    ]

    failures_last_24h = _coerce_int(
        db.scalar(
            select(func.count())
            .select_from(Failure)
            .where(Failure.created_at >= twenty_four_hours_ago)
        )
    )
    failures_previous_24h = _coerce_int(
        db.scalar(
            select(func.count())
            .select_from(Failure)
            .where(
                Failure.created_at >= forty_eight_hours_ago,
                Failure.created_at < twenty_four_hours_ago,
            )
        )
    )

    if failures_previous_24h == 0:
        delta_percentage = 100.0 if failures_last_24h > 0 else 0.0
    else:
        delta_percentage = (
            (failures_last_24h - failures_previous_24h) / float(failures_previous_24h)
        ) * 100.0

    direction: Literal["up", "down", "flat"]
    if failures_last_24h > failures_previous_24h:
        direction = "up"
    elif failures_last_24h < failures_previous_24h:
        direction = "down"
    else:
        direction = "flat"

    return InternalAnalyticsOverview(
        active_users=active_users,
        top_projects=top_projects,
        credits_used_last_30_days=abs(credits_used_raw),
        failure_trend=InternalFailureTrend(
            failures_last_24h=failures_last_24h,
            failures_previous_24h=failures_previous_24h,
            delta_percentage=round(delta_percentage, 2),
            direction=direction,
        ),
    )
