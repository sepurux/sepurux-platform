from __future__ import annotations

from datetime import UTC, datetime, timedelta
from time import perf_counter

from app.models import Run
from app.schemas import InternalSystemOverview
from app.services.internal_queue_service import get_internal_queue_overview
from sqlalchemy import func, select
from sqlalchemy.orm import Session

SERVICE_STARTED_AT = datetime.now(UTC)
FAILED_RUN_STATUSES = {"failed", "error"}


def _coerce_int(value: object) -> int:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    return 0


def build_internal_system_overview(db: Session) -> InternalSystemOverview:
    latency_start = perf_counter()
    db.scalar(select(func.count()).select_from(Run))
    api_latency_ms = round((perf_counter() - latency_start) * 1000.0, 2)

    queue_overview = get_internal_queue_overview(limit=10)

    twenty_four_hours_ago = datetime.now(UTC) - timedelta(hours=24)
    runs_last_24h = _coerce_int(
        db.scalar(
            select(func.count()).select_from(Run).where(Run.created_at >= twenty_four_hours_ago)
        )
    )
    failed_runs_last_24h = _coerce_int(
        db.scalar(
            select(func.count())
            .select_from(Run)
            .where(
                Run.created_at >= twenty_four_hours_ago,
                Run.status.in_(sorted(FAILED_RUN_STATUSES)),
            )
        )
    )

    error_rate_24h = 0.0
    if runs_last_24h > 0:
        error_rate_24h = round((failed_runs_last_24h / float(runs_last_24h)) * 100.0, 2)

    uptime_seconds = int((datetime.now(UTC) - SERVICE_STARTED_AT).total_seconds())

    return InternalSystemOverview(
        api_latency_ms=api_latency_ms,
        worker_status=queue_overview.worker_status,
        queue_backlog=queue_overview.queue_backlog,
        runs_last_24h=runs_last_24h,
        failed_runs_last_24h=failed_runs_last_24h,
        error_rate_24h=error_rate_24h,
        uptime_seconds=max(uptime_seconds, 0),
    )
