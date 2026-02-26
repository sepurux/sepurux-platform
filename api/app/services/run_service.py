from __future__ import annotations

from collections import Counter
from typing import Any
from uuid import UUID, uuid4

from app.models import Campaign, ReplayAttempt, Run, Trace
from app.queue import get_run_queue
from sqlalchemy import select
from sqlalchemy.orm import Session


class RelatedRecordNotFoundError(Exception):
    pass


def create_run(db: Session, *, project_id: UUID, trace_id: UUID, campaign_id: UUID) -> Run:
    if (
        db.scalar(select(Trace).where(Trace.trace_id == trace_id, Trace.project_id == project_id))
        is None
    ):
        raise RelatedRecordNotFoundError("Trace not found")
    if (
        db.scalar(
            select(Campaign).where(
                Campaign.campaign_id == campaign_id,
                Campaign.project_id == project_id,
            )
        )
        is None
    ):
        raise RelatedRecordNotFoundError("Campaign not found")

    return _create_run_record(
        db,
        project_id=project_id,
        trace_id=trace_id,
        campaign_id=campaign_id,
        summary=None,
    )


def _create_run_record(
    db: Session,
    *,
    project_id: UUID,
    trace_id: UUID,
    campaign_id: UUID,
    summary: Any | None,
) -> Run:
    run = Run(
        run_id=uuid4(),
        project_id=project_id,
        trace_id=trace_id,
        campaign_id=campaign_id,
        status="queued",
        summary=summary,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def enqueue_execute_run(run: Run) -> None:
    # Use a fully-qualified function path so RQ workers can import it reliably.
    get_run_queue().enqueue("worker.execute_run", str(run.run_id))


def create_run_and_enqueue(
    db: Session, *, project_id: UUID, trace_id: UUID, campaign_id: UUID
) -> Run:
    run = create_run(db=db, project_id=project_id, trace_id=trace_id, campaign_id=campaign_id)
    enqueue_execute_run(run)
    return run


def create_ci_run_and_enqueue(
    db: Session,
    *,
    trace_id: UUID,
    campaign_id: UUID,
    thresholds: dict[str, Any],
) -> Run:
    trace = db.scalar(select(Trace).where(Trace.trace_id == trace_id))
    if trace is None:
        raise RelatedRecordNotFoundError("Trace not found")

    campaign = db.scalar(select(Campaign).where(Campaign.campaign_id == campaign_id))
    if campaign is None:
        raise RelatedRecordNotFoundError("Campaign not found")

    if trace.project_id != campaign.project_id:
        raise ValueError("Trace and campaign must belong to the same project")

    run = _create_run_record(
        db,
        project_id=trace.project_id,
        trace_id=trace_id,
        campaign_id=campaign_id,
        summary={"ci_thresholds": thresholds},
    )
    enqueue_execute_run(run)
    return run


def get_run(db: Session, *, project_id: UUID, run_id: UUID) -> Run | None:
    stmt = select(Run).where(Run.run_id == run_id, Run.project_id == project_id)
    return db.scalar(stmt)


def get_run_unscoped(db: Session, *, run_id: UUID) -> Run | None:
    return db.scalar(select(Run).where(Run.run_id == run_id))


def list_recent_runs(db: Session, *, project_id: UUID, limit: int = 20) -> list[Run]:
    stmt = (
        select(Run)
        .where(Run.project_id == project_id)
        .order_by(Run.created_at.desc(), Run.run_id.desc())
        .limit(limit)
    )
    return list(db.scalars(stmt))


def run_metadata(run: Run) -> dict[str, Any]:
    summary = run.summary if isinstance(run.summary, dict) else None
    summary_attempts = _summary_int(summary, "attempt_count")
    summary_passed = _summary_int(summary, "passed_count")
    summary_unsafe = _summary_int(summary, "unsafe_count")
    if summary_unsafe is None:
        summary_unsafe = _summary_int(summary, "unsafe_attempts")
    summary_pass_rate = _summary_float(summary, "pass_rate")
    if summary_pass_rate is None and summary_attempts is not None and summary_passed is not None:
        summary_pass_rate = _ratio(summary_passed, summary_attempts)

    return {
        "run_id": run.run_id,
        "trace_id": run.trace_id,
        "campaign_id": run.campaign_id,
        "status": run.status,
        "summary": run.summary,
        "pass_rate": summary_pass_rate,
        "unsafe_count": summary_unsafe,
        "created_at": run.created_at,
    }


def get_run_quality_metrics(
    db: Session,
    *,
    run_id: UUID,
    project_id: UUID | None = None,
) -> dict[str, Any]:
    stmt = select(ReplayAttempt).where(ReplayAttempt.run_id == run_id)
    if project_id is not None:
        stmt = stmt.where(ReplayAttempt.project_id == project_id)
    attempts = list(db.scalars(stmt))

    total = len(attempts)
    passed_count = 0
    failed_count = 0
    unsafe_count = 0
    failures_by_tool: Counter[str] = Counter()

    for attempt in attempts:
        if _is_pass_result(attempt.result):
            passed_count += 1
        if _is_fail_result(attempt.result):
            failed_count += 1
            failures_by_tool[attempt.first_failure_tool or "unknown"] += 1
        if _is_unsafe_attempt(attempt):
            unsafe_count += 1

    failures_by_tool_pct = [
        {
            "tool": tool,
            "count": count,
            "pct": _ratio(count, failed_count),
        }
        for tool, count in _sorted_counter_items(failures_by_tool)
    ]
    top_failing_tools = [
        {"tool": item["tool"], "count": item["count"]} for item in failures_by_tool_pct[:3]
    ]

    return {
        "attempt_count": total,
        "passed_count": passed_count,
        "failed_count": failed_count,
        "failures": failed_count,
        "pass_rate": _ratio(passed_count, total),
        "unsafe_count": unsafe_count,
        "unsafe_attempts": unsafe_count,
        "failures_by_tool": failures_by_tool_pct,
        "top_failing_tools": top_failing_tools,
    }


def _summary_int(summary: dict[str, Any] | None, key: str) -> int | None:
    if summary is None:
        return None
    value = summary.get(key)
    if isinstance(value, int):
        return value
    return None


def _summary_float(summary: dict[str, Any] | None, key: str) -> float | None:
    if summary is None:
        return None
    value = summary.get(key)
    if isinstance(value, int | float):
        return float(value)
    return None


def _is_pass_result(result: str | None) -> bool:
    return (result or "").lower() in {"pass", "passed"}


def _is_fail_result(result: str | None) -> bool:
    return (result or "").lower() in {"fail", "failed"}


def _is_unsafe_attempt(attempt: ReplayAttempt) -> bool:
    reason = (attempt.failure_reason or "").lower()
    # We don't persist per-attempt metrics on ReplayAttempt, so use failure_reason conventions.
    # Keep policy_blocked for backwards compatibility with existing worker outcomes.
    return reason.startswith("unsafe") or reason == "policy_blocked"


def _ratio(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round(numerator / denominator, 4)


def _sorted_counter_items(counter: Counter[str]) -> list[tuple[str, int]]:
    return sorted(counter.items(), key=lambda item: (-item[1], item[0]))
