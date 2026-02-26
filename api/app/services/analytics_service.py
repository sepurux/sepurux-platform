from __future__ import annotations

from collections import Counter, defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from app.models import ReplayAttempt, Run
from sqlalchemy import select
from sqlalchemy.orm import Session


class RunNotFoundError(Exception):
    pass


def get_run_stats(db: Session, *, project_id: UUID, run_id: UUID) -> dict[str, Any]:
    run = db.scalar(select(Run).where(Run.run_id == run_id, Run.project_id == project_id))
    if run is None:
        raise RunNotFoundError("Run not found")

    attempts = list(
        db.scalars(
            select(ReplayAttempt).where(
                ReplayAttempt.run_id == run_id,
                ReplayAttempt.project_id == project_id,
            )
        )
    )
    total = len(attempts)
    passed_attempts = [attempt for attempt in attempts if _is_pass_result(attempt.result)]
    failed_attempts = [attempt for attempt in attempts if _is_fail_result(attempt.result)]
    failed_count = len(failed_attempts)

    failures_by_tool = Counter(
        (attempt.first_failure_tool or "unknown") for attempt in failed_attempts
    )
    tools_usage_attempts: Counter[str] = Counter()
    tools_usage_calls: Counter[str] = Counter()
    for attempt in attempts:
        tools_touched = _tools_touched_for_denominator(attempt)
        for tool in tools_touched:
            tools_usage_attempts[tool] += 1

        call_counts = _tool_call_counts_for_attempt(attempt, tools_touched=tools_touched)
        for tool, count in call_counts.items():
            tools_usage_calls[tool] += count

    failures_by_mutation = Counter(attempt.mutation_id for attempt in failed_attempts)
    top_failure_reasons = Counter(
        (attempt.failure_reason or "unknown") for attempt in failed_attempts
    )

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
        "tools_usage": [
            {
                "tool": tool,
                "attempts": attempts_count,
                "calls": tools_usage_calls.get(tool, 0),
            }
            for tool, attempts_count in _sorted_tool_usage_items(
                tools_usage_attempts,
                tools_usage_calls,
            )
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
    project_id: UUID,
    window_days: int = 7,
    limit: int = 20,
) -> dict[str, Any]:
    generated_at = datetime.now(UTC)
    cutoff = generated_at - timedelta(days=window_days)

    attempts = _recent_attempts(db, project_id=project_id, cutoff=cutoff)
    attempts_by_tool: Counter[str] = Counter()
    failures_by_tool: dict[str, list[ReplayAttempt]] = defaultdict(list)
    for attempt in attempts:
        tools_touched = _tools_touched_for_denominator(attempt)
        for tool in tools_touched:
            attempts_by_tool[tool] += 1

        failure_tool = _fragility_failure_tool(attempt, tools_touched=tools_touched)
        if failure_tool is not None:
            failures_by_tool[failure_tool].append(attempt)

    tools: list[dict[str, Any]] = []
    for tool, tool_failed_attempts in failures_by_tool.items():
        failures = len(tool_failed_attempts)
        attempts_count = attempts_by_tool.get(tool, 0)
        mutation_counter = Counter(attempt.mutation_id for attempt in tool_failed_attempts)
        reason_counter = Counter(
            (attempt.failure_reason or "unknown") for attempt in tool_failed_attempts
        )
        tools.append(
            {
                "tool": tool,
                "attempts": attempts_count,
                "failures": failures,
                "failure_rate": _ratio(failures, attempts_count),
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
        "attempts_definition": "tools_touched_denominator_first_failure_numerator",
        "tools": tools[:limit],
    }


def get_mutation_summary(
    db: Session,
    *,
    project_id: UUID,
    window_days: int = 7,
    limit: int = 20,
) -> dict[str, Any]:
    cutoff = datetime.now(UTC) - timedelta(days=window_days)
    attempts = [
        attempt
        for attempt in _recent_attempts(db, project_id=project_id, cutoff=cutoff)
        if _is_fail_result(attempt.result)
    ]

    by_mutation: dict[str, list[ReplayAttempt]] = defaultdict(list)
    for attempt in attempts:
        by_mutation[attempt.mutation_id].append(attempt)

    mutations: list[dict[str, Any]] = []
    for mutation_id, mutation_attempts in by_mutation.items():
        tool_counter = Counter(
            (attempt.first_failure_tool or "unknown") for attempt in mutation_attempts
        )
        reason_counter = Counter(
            (attempt.failure_reason or "unknown") for attempt in mutation_attempts
        )
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


def _recent_attempts(db: Session, *, project_id: UUID, cutoff: datetime) -> list[ReplayAttempt]:
    attempts = list(db.scalars(select(ReplayAttempt).where(ReplayAttempt.project_id == project_id)))
    return [attempt for attempt in attempts if _normalize_dt(attempt.created_at) >= cutoff]


def _normalize_dt(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _is_pass_result(result: str | None) -> bool:
    return (result or "").lower() in {"pass", "passed"}


def _is_fail_result(result: str | None) -> bool:
    return (result or "").lower() in {"fail", "failed"}


def _tools_touched_for_denominator(attempt: ReplayAttempt) -> list[str]:
    tools: list[str] = []
    seen: set[str] = set()
    raw_tools = attempt.tools_touched
    if isinstance(raw_tools, list):
        for item in raw_tools:
            if not isinstance(item, str) or not item:
                continue
            if item in seen:
                continue
            seen.add(item)
            tools.append(item)

    # Backward-compatible fallback for older rows without tool metadata.
    if tools:
        return tools
    if _is_fail_result(attempt.result) and attempt.first_failure_tool:
        return [attempt.first_failure_tool]
    return []


def _tool_call_counts_for_attempt(
    attempt: ReplayAttempt,
    *,
    tools_touched: list[str] | None = None,
) -> dict[str, int]:
    counts: dict[str, int] = {}
    raw_counts = attempt.tool_call_counts
    if isinstance(raw_counts, dict):
        for raw_tool, raw_count in raw_counts.items():
            if not isinstance(raw_tool, str) or not raw_tool:
                continue
            if not isinstance(raw_count, int):
                continue
            counts[raw_tool] = max(0, raw_count)

    tools_touched = (
        tools_touched if tools_touched is not None else _tools_touched_for_denominator(attempt)
    )
    if counts:
        return counts

    # Backward-compatible fallback: if we know a tool was touched, treat it as one call.
    return {tool: 1 for tool in tools_touched}


def _fragility_failure_tool(
    attempt: ReplayAttempt,
    *,
    tools_touched: list[str] | None = None,
) -> str | None:
    if not _is_fail_result(attempt.result):
        return None
    if attempt.first_failure_tool:
        return attempt.first_failure_tool
    tools_touched = (
        tools_touched if tools_touched is not None else _tools_touched_for_denominator(attempt)
    )
    if len(tools_touched) == 1:
        return tools_touched[0]
    return None


def _ratio(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round(numerator / denominator, 4)


def _sorted_counter_items(counter: Counter[str]) -> list[tuple[str, int]]:
    return sorted(counter.items(), key=lambda item: (-item[1], item[0]))


def _sorted_tool_usage_items(
    attempts_by_tool: Counter[str],
    calls_by_tool: Counter[str],
) -> list[tuple[str, int]]:
    return sorted(
        attempts_by_tool.items(),
        key=lambda item: (-item[1], -calls_by_tool.get(item[0], 0), item[0]),
    )
