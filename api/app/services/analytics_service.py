from __future__ import annotations

from collections import Counter, defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from app.models import (
    Counterfactual,
    CreditTransaction,
    Failure,
    PolicyEvent,
    ReplayAttempt,
    Run,
    SecurityEvent,
)
from app.services.insights_service import build_run_insights
from sqlalchemy import func, select
from sqlalchemy.orm import Session

LETHAL_MUTATIONS_MIN_ATTEMPTS_HIT = 5
LETHAL_MUTATIONS_MAX_RESULTS = 10


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
    most_lethal_mutations = _aggregate_most_lethal_mutations(attempts)
    policy_metrics = _policy_metrics_for_run(
        db,
        run=run,
    )
    security_metrics = _security_metrics_for_run(
        db,
        run=run,
    )
    counterfactual_metrics = _counterfactual_metrics_for_attempts(
        db,
        project_id=project_id,
        attempts=attempts,
    )
    insights = build_run_insights(
        run_id=run_id,
        failed_attempts=failed_count,
        failures_by_tool=[
            {"tool": tool, "count": count, "pct": _ratio(count, failed_count)}
            for tool, count in _sorted_counter_items(failures_by_tool)
        ],
        failures_by_mutation=[
            {"mutation_id": mutation_id, "count": count, "pct": _ratio(count, failed_count)}
            for mutation_id, count in _sorted_counter_items(failures_by_mutation)
        ],
        top_failure_reasons=[
            {"reason": reason, "count": count, "pct": _ratio(count, failed_count)}
            for reason, count in _sorted_counter_items(top_failure_reasons)
        ],
        most_lethal_mutations=most_lethal_mutations,
        policy_violations_total=policy_metrics["policy_violations_total"],
        policy_requires_approval=policy_metrics["policy_requires_approval"],
        policy_blocked_tools=policy_metrics["policy_blocked_tools"],
        counterfactual_total=counterfactual_metrics["total"],
        counterfactual_passed=counterfactual_metrics["passed"],
    )

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
        "attribution": "mvp_multi_attribution_each_applied_mutation_gets_credit",
        "most_lethal_mutations": most_lethal_mutations,
        "injection_blocks": security_metrics["injection_blocks"],
        "injection_sanitizations": security_metrics["injection_sanitizations"],
        "insights": insights,
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


def _aggregate_most_lethal_mutations(
    attempts: list[ReplayAttempt],
    *,
    min_attempts_hit: int = LETHAL_MUTATIONS_MIN_ATTEMPTS_HIT,
    limit: int = LETHAL_MUTATIONS_MAX_RESULTS,
) -> list[dict[str, Any]]:
    attempts_hit: Counter[str] = Counter()
    failures: Counter[str] = Counter()
    top_tools_by_mutation: defaultdict[str, Counter[str]] = defaultdict(Counter)
    top_reasons_by_mutation: defaultdict[str, Counter[str]] = defaultdict(Counter)

    for attempt in attempts:
        mutation_ids = _mutation_ids_from_trace(attempt)
        if not mutation_ids:
            continue

        for mutation_id in mutation_ids:
            attempts_hit[mutation_id] += 1

        if not _is_fail_result(attempt.result):
            continue

        failure_tool = attempt.first_failure_tool or "unknown"
        failure_reason = attempt.failure_reason or "unknown"
        for mutation_id in mutation_ids:
            failures[mutation_id] += 1
            top_tools_by_mutation[mutation_id][failure_tool] += 1
            top_reasons_by_mutation[mutation_id][failure_reason] += 1

    rows: list[dict[str, Any]] = []
    for mutation_id, attempts_count in attempts_hit.items():
        if attempts_count < min_attempts_hit:
            continue
        failed_count = failures.get(mutation_id, 0)
        failure_rate_when_hit = _ratio(failed_count, attempts_count)
        rows.append(
            {
                "mutation_id": mutation_id,
                "failures": failed_count,
                "attempts_hit": attempts_count,
                "failure_rate_when_hit": failure_rate_when_hit,
                "top_tools": [
                    {"tool": tool, "count": count}
                    for tool, count in _sorted_counter_items(top_tools_by_mutation[mutation_id])[:3]
                ],
                "top_reasons": [
                    {"reason": reason, "count": count}
                    for reason, count in _sorted_counter_items(
                        top_reasons_by_mutation[mutation_id]
                    )[:3]
                ],
            }
        )

    rows.sort(
        key=lambda item: (
            -item["failures"],
            -item["failure_rate_when_hit"],
            -item["attempts_hit"],
            item["mutation_id"],
        )
    )
    return rows[:limit]


def _mutation_ids_from_trace(attempt: ReplayAttempt) -> set[str]:
    trace = attempt.mutation_trace
    if not isinstance(trace, dict):
        return set()
    applied = trace.get("applied")
    if not isinstance(applied, list):
        return set()

    mutation_ids: set[str] = set()
    for item in applied:
        if not isinstance(item, dict):
            continue
        mutation_id = item.get("mutation_id")
        if isinstance(mutation_id, str) and mutation_id:
            mutation_ids.add(mutation_id)
    return mutation_ids


def _policy_metrics_for_run(
    db: Session,
    *,
    run: Run,
) -> dict[str, Any]:
    summary = run.summary if isinstance(run.summary, dict) else {}

    summary_requires = _summary_int(
        summary, keys=("policy_requires_approval", "policy_requires_approval_count")
    )
    summary_denies = _summary_int(summary, keys=("policy_denies", "policy_denied_count"))
    summary_total = _summary_int(summary, keys=("policy_violations_total",))
    if summary_total <= 0:
        summary_total = summary_requires + summary_denies

    policy_events = list(
        db.scalars(
            select(PolicyEvent).where(
                PolicyEvent.run_id == run.run_id,
            )
        )
    )
    requires_count = 0
    denies_count = 0
    blocked_tools: Counter[str] = Counter()
    for event in policy_events:
        if event.decision == "require_approval":
            requires_count += 1
            blocked_tools[event.tool] += 1
        elif event.decision == "deny":
            denies_count += 1
            blocked_tools[event.tool] += 1

    requires = max(summary_requires, requires_count)
    denies = max(summary_denies, denies_count)
    total = max(summary_total, requires + denies)

    return {
        "policy_requires_approval": requires,
        "policy_denies": denies,
        "policy_violations_total": total,
        "policy_blocked_tools": [
            {"tool": tool, "count": count} for tool, count in _sorted_counter_items(blocked_tools)
        ],
    }


def _counterfactual_metrics_for_attempts(
    db: Session,
    *,
    project_id: UUID,
    attempts: list[ReplayAttempt],
) -> dict[str, int]:
    attempt_ids = [attempt.attempt_id for attempt in attempts]
    if not attempt_ids:
        return {"total": 0, "passed": 0}

    counterfactuals = list(
        db.scalars(
            select(Counterfactual).where(
                Counterfactual.project_id == project_id,
                Counterfactual.attempt_id.in_(attempt_ids),
            )
        )
    )
    passed = 0
    for item in counterfactuals:
        if _is_pass_result(item.result):
            passed += 1
    return {"total": len(counterfactuals), "passed": passed}


def _security_metrics_for_run(
    db: Session,
    *,
    run: Run,
) -> dict[str, int]:
    summary = run.summary if isinstance(run.summary, dict) else {}
    summary_blocks = _summary_int(summary, keys=("injection_blocks",))
    summary_sanitizations = _summary_int(summary, keys=("injection_sanitizations",))

    events = list(
        db.scalars(
            select(SecurityEvent).where(
                SecurityEvent.run_id == run.run_id,
            )
        )
    )
    blocks = 0
    sanitizations = 0
    for event in events:
        if event.action == "block":
            blocks += 1
        elif event.action == "sanitize":
            sanitizations += 1

    return {
        "injection_blocks": max(summary_blocks, blocks),
        "injection_sanitizations": max(summary_sanitizations, sanitizations),
    }


def _summary_int(summary: dict[str, Any], *, keys: tuple[str, ...]) -> int:
    for key in keys:
        value = summary.get(key)
        if isinstance(value, bool):
            continue
        if isinstance(value, int):
            return max(0, value)
        if isinstance(value, float):
            return max(0, int(value))
    return 0


def get_project_reliability_summary(
    db: Session,
    *,
    project_id: UUID,
    billable_user_id: UUID | None = None,
) -> dict[str, Any]:
    campaigns_run = db.scalar(
        select(func.count(Run.run_id)).where(Run.project_id == project_id)
    ) or 0

    severity_counts: Counter[str] = Counter()
    failure_breakdown: Counter[str] = Counter()
    for failure in db.scalars(select(Failure).where(Failure.project_id == project_id)):
        severity_counts[failure.severity] += 1
        failure_breakdown[failure.failure_type] += 1

    score = 100.0 - severity_counts.get("critical", 0) * 10
    score -= severity_counts.get("high", 0) * 5
    score -= severity_counts.get("medium", 0) * 2
    score = max(0.0, score)

    status = "healthy"
    if score < 70:
        status = "critical"
    elif score < 90:
        status = "warning"

    credits_used = 0
    if billable_user_id is not None:
        since = datetime.now(UTC) - timedelta(days=30)
        raw = db.scalar(
            select(func.sum(-CreditTransaction.amount)).where(
                CreditTransaction.user_id == billable_user_id,
                CreditTransaction.type == "usage",
                CreditTransaction.created_at >= since,
            )
        )
        credits_used = int(raw) if raw is not None else 0

    breakdown_items = [
        {"type": t, "count": c}
        for t, c in sorted(failure_breakdown.items(), key=lambda x: (-x[1], x[0]))
    ]

    return {
        "reliability_score": score,
        "status": status,
        "campaigns_run": campaigns_run,
        "credits_used": credits_used,
        "failure_breakdown": breakdown_items,
    }
