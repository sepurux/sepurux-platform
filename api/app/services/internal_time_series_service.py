from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

from app.models import Failure, Run
from app.schemas import (
    InternalDateCountMetric,
    InternalDateScoreMetric,
    InternalTimeSeriesMetrics,
)
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

FAILED_RUN_STATUSES = {"failed", "error"}


def _coerce_int(value: object) -> int:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    return 0


def _to_date(value: object) -> date | None:
    if isinstance(value, date):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError:
            return None
    return None


def build_internal_time_series(
    db: Session,
    *,
    window_days: int = 14,
    now: datetime | None = None,
) -> InternalTimeSeriesMetrics:
    current_time = now or datetime.now(UTC)
    days = max(7, min(int(window_days), 90))
    start_date = current_time.date() - timedelta(days=days - 1)
    start_datetime = datetime.combine(start_date, datetime.min.time(), tzinfo=UTC)

    failure_rows = db.execute(
        select(
            func.date(Failure.created_at).label("bucket"),
            func.count().label("count"),
        )
        .where(Failure.created_at >= start_datetime)
        .group_by("bucket")
    ).all()
    failures_by_date = {
        day: _coerce_int(count)
        for bucket, count in failure_rows
        if (day := _to_date(bucket)) is not None
    }

    campaigns_rows = db.execute(
        select(
            func.date(Run.created_at).label("bucket"),
            func.count(func.distinct(Run.campaign_id)).label("count"),
        )
        .where(
            Run.created_at >= start_datetime,
            Run.campaign_id.is_not(None),
        )
        .group_by("bucket")
    ).all()
    campaigns_by_date = {
        day: _coerce_int(count)
        for bucket, count in campaigns_rows
        if (day := _to_date(bucket)) is not None
    }

    failed_count_expr = func.sum(
        case(
            (Run.status.in_(sorted(FAILED_RUN_STATUSES)), 1),
            else_=0,
        )
    )
    reliability_rows = db.execute(
        select(
            func.date(Run.created_at).label("bucket"),
            func.count().label("total_runs"),
            func.coalesce(failed_count_expr, 0).label("failed_runs"),
        )
        .where(Run.created_at >= start_datetime)
        .group_by("bucket")
    ).all()
    reliability_by_date: dict[date, float] = {}
    for bucket, total_runs, failed_runs in reliability_rows:
        bucket_date = _to_date(bucket)
        if bucket_date is None:
            continue
        total = _coerce_int(total_runs)
        failed = _coerce_int(failed_runs)
        if total <= 0:
            reliability_by_date[bucket_date] = 100.0
            continue
        reliability_by_date[bucket_date] = round(
            ((float(total) - float(failed)) / float(total)) * 100.0,
            2,
        )

    failures_over_time: list[InternalDateCountMetric] = []
    campaigns_per_day: list[InternalDateCountMetric] = []
    reliability_trends: list[InternalDateScoreMetric] = []
    for offset in range(days):
        bucket_date = start_date + timedelta(days=offset)
        failures_over_time.append(
            InternalDateCountMetric(date=bucket_date, value=failures_by_date.get(bucket_date, 0))
        )
        campaigns_per_day.append(
            InternalDateCountMetric(date=bucket_date, value=campaigns_by_date.get(bucket_date, 0))
        )
        reliability_trends.append(
            InternalDateScoreMetric(
                date=bucket_date,
                value=reliability_by_date.get(bucket_date, 100.0),
            )
        )

    return InternalTimeSeriesMetrics(
        window_days=days,
        failures_over_time=failures_over_time,
        campaigns_per_day=campaigns_per_day,
        reliability_trends=reliability_trends,
    )
