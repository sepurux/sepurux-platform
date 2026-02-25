from __future__ import annotations

from collections import Counter, defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ReplayAttempt, Run


class RunNotFoundError(Exception):
    pass


def get_run_stats(db: Session, *, run_id: UUID) -> dict[str, Any]:
    run = db.get(Run, run_id)
    if run is None:
        raise RunNotFoundError("Run not found")

    attempts = list(db.scalars(select(ReplayAttempt).where(ReplayAttempt.run_id == run_id)))
    total = len(attempts)
    passed_attempts = [attempt for attempt in attempts if _is_pass_result(attempt.result)]
    failed_attempts = [attempt for attempt in attempts if _is_fail_result(attempt.result)]
    failed_count = len(failed_attempts)

    failures_by_tool = Counter((attempt.first_failure_tool or "unknown") for attempt in failed_attempts)
    failures_by_mutation = Counter(attempt.mutation_id for attempt in failed_attempts)
    top_failure_reasons = Counter((attempt.failure_reason or "unknown") for attempt in failed_attempts)

    first_failure_step_counter: Counter[int] = Counter()
    for attempt in failed_attempts:
        if attempt.first_failure_event_index is not None:
            first_failure_step_counter[attempt.first_failure_event_index] += 1

    return {
        "run_id": run_id,
        "attempts": {
            "total": total,
            "passed": len(passed_attempts),
            "failed": failed_count,
            "pass_rate": _ratio(len(passed_attempts), total),
        },
        "failures_by_tool": [
            {"tool": tool, "count": count, "pct": _ratio(count, failed_count)}
            for tool, count in _sorted_counter_items(failures_by_tool)
        ],
        "failures_by_mutation": [
            {"mutation_id": mutation_id, "count": count, "pct": _ratio(count, failed_count)}
            for mutation_id, count in _sorted_counter_items(failures_by_mutation)
        ],
        "top_failure_reasons": [
            {"reason": reason, "count": count, "pct": _ratio(count, failed_count)}
            for reason, count in _sorted_counter_items(top_failure_reasons)
        ],
        "first_failure_step_distribution": [
            {"event_index": event_index, "count": count}
            for event_index, count in sorted(first_failure_step_counter.items())
        ],
    }


def get_tool_fragility(
    db: Session,
    *,
    window_days: int = 7,
    limit: int = 20,
) -> dict[str, Any]:
    generated_at = datetime.now(UTC)
    cutoff = generated_at - timedelta(days=window_days)

    attempts = _recent_attempts(db, cutoff=cutoff)
    failed_attempts_with_tool = [
        attempt
        for attempt in attempts
        if _is_fail_result(attempt.result) and attempt.first_failure_tool is not None
    ]

    by_tool: dict[str, list[ReplayAttempt]] = defaultdict(list)
    for attempt in failed_attempts_with_tool:
        by_tool[attempt.first_failure_tool or "unknown"].append(attempt)

    tools: list[dict[str, Any]] = []
    for tool, tool_attempts in by_tool.items():
        failures = len(tool_attempts)
        mutation_counter = Counter(attempt.mutation_id for attempt in tool_attempts)
        reason_counter = Counter((attempt.failure_reason or "unknown") for attempt in tool_attempts)
        tools.append(
            {
                "tool": tool,
                "attempts": failures,
                "failures": failures,
                "failure_rate": _ratio(failures, failures),
                "top_mutations": [
                    {"mutation_id": mutation_id, "count": count}
                    for mutation_id, count in _sorted_counter_items(mutation_counter)[:5]
                ],
                "top_reasons": [
                    {"reason": reason, "count": count}
                    for reason, count in _sorted_counter_items(reason_counter)[:5]
                ],
            }
        )

    tools.sort(key=lambda item: (-item["failures"], item["tool"]))

    return {
        "window_days": window_days,
        "generated_at": generated_at,
        "attempts_definition": "first_failure_only",
        "tools": tools[:limit],
    }


def get_mutation_summary(
    db: Session,
    *,
    window_days: int = 7,
    limit: int = 20,
) -> dict[str, Any]:
    cutoff = datetime.now(UTC) - timedelta(days=window_days)
    attempts = [
        attempt
        for attempt in _recent_attempts(db, cutoff=cutoff)
        if _is_fail_result(attempt.result)
    ]

    by_mutation: dict[str, list[ReplayAttempt]] = defaultdict(list)
    for attempt in attempts:
        by_mutation[attempt.mutation_id].append(attempt)

    mutations: list[dict[str, Any]] = []
    for mutation_id, mutation_attempts in by_mutation.items():
        tool_counter = Counter((attempt.first_failure_tool or "unknown") for attempt in mutation_attempts)
        reason_counter = Counter((attempt.failure_reason or "unknown") for attempt in mutation_attempts)
        mutations.append(
            {
                "mutation_id": mutation_id,
                "failures": len(mutation_attempts),
                "top_tools": [
                    {"tool": tool, "count": count}
                    for tool, count in _sorted_counter_items(tool_counter)[:5]
                ],
                "top_reasons": [
                    {"reason": reason, "count": count}
                    for reason, count in _sorted_counter_items(reason_counter)[:5]
                ],
            }
        )

    mutations.sort(key=lambda item: (-item["failures"], item["mutation_id"]))
    return {"window_days": window_days, "mutations": mutations[:limit]}


def _recent_attempts(db: Session, *, cutoff: datetime) -> list[ReplayAttempt]:
    attempts = list(db.scalars(select(ReplayAttempt)))
    return [attempt for attempt in attempts if _normalize_dt(attempt.created_at) >= cutoff]


def _normalize_dt(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _is_pass_result(result: str | None) -> bool:
    return (result or "").lower() in {"pass", "passed"}


def _is_fail_result(result: str | None) -> bool:
    return (result or "").lower() in {"fail", "failed"}


def _ratio(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round(numerator / denominator, 4)


def _sorted_counter_items(counter: Counter[str]) -> list[tuple[str, int]]:
    return sorted(counter.items(), key=lambda item: (-item[1], item[0]))

