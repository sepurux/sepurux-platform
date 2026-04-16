from __future__ import annotations

from typing import Any
from uuid import UUID


def build_run_insights(
    *,
    run_id: UUID,
    failed_attempts: int,
    failures_by_tool: list[dict[str, Any]],
    failures_by_mutation: list[dict[str, Any]],
    top_failure_reasons: list[dict[str, Any]],
    most_lethal_mutations: list[dict[str, Any]],
    policy_violations_total: int,
    policy_requires_approval: int,
    policy_blocked_tools: list[dict[str, Any]] | None = None,
    counterfactual_total: int = 0,
    counterfactual_passed: int = 0,
) -> list[dict[str, Any]]:
    insights: list[dict[str, Any]] = []
    top_tool = _top_failure_tool(failures_by_tool)
    top_reasons = _trim_reasons(top_failure_reasons, limit=3)
    top_mutations = _trim_mutations(failures_by_mutation, limit=3)
    policy_tools = policy_blocked_tools or []

    schema_lethal = [
        item
        for item in most_lethal_mutations
        if _is_schema_mutation(str(item.get("mutation_id", "")))
    ]
    timeout_lethal = [
        item
        for item in most_lethal_mutations
        if _is_timeout_mutation(str(item.get("mutation_id", "")))
    ]
    rate_limit_lethal = [
        item
        for item in most_lethal_mutations
        if _is_rate_limit_mutation(str(item.get("mutation_id", "")))
    ]
    poison_lethal = [
        item
        for item in most_lethal_mutations
        if _is_poison_mutation(str(item.get("mutation_id", "")))
    ]

    boost = _counterfactual_boost(total=counterfactual_total, passed=counterfactual_passed)

    if policy_requires_approval > 0 or policy_violations_total > 0:
        title = "Add confirmation-token flow for irreversible tools"
        recommendation = (
            "Require and propagate confirmation_token for payments.refund and "
            "jira.create_issue(commit); fail closed when token is missing."
        )
        why = (
            f"{policy_requires_approval} approval-required event(s) and "
            f"{policy_violations_total} policy violation(s) detected in this run."
        )
        insights.append(
            _insight(
                insight_id="insight.approval_tokens.irreversible_tools",
                title=title,
                recommendation=recommendation,
                why=why,
                confidence=_confidence(
                    0.78, boost=boost, extra=0.04 if policy_requires_approval >= 3 else 0.0
                ),
                evidence={
                    "top_tools": _trim_tools(policy_tools, limit=3),
                    "top_mutations": top_mutations,
                    "top_reasons": top_reasons,
                },
            )
        )

    # Track tools already addressed by specific insights so the generic hotspot
    # insight does not fire redundantly for the same tool.
    covered_tools: set[str] = set()

    if schema_lethal:
        schema_failures = sum(_int(item.get("failures")) for item in schema_lethal)
        schema_top_tool = _tool_from_lethal(schema_lethal) or top_tool or "replay.tool"
        multi_attr_pct = _safe_percent(schema_failures, failed_attempts)
        insights.append(
            _insight(
                insight_id=f"insight.schema_adapter.{_slug(schema_top_tool)}",
                title=f"Add schema adapter for {schema_top_tool}",
                recommendation=(
                    "Implement mapping for renamed/missing fields; validate required keys "
                    "before use with strict contract checks."
                ),
                why=(
                    f"Schema mutations are linked to {schema_failures} failed attempts "
                    f"({multi_attr_pct}% multi-attributed); top impacted tool is {schema_top_tool}."
                ),
                confidence=_confidence(0.72, boost=boost),
                evidence={
                    "top_tools": _trim_tools_from_lethal(schema_lethal, limit=3),
                    "top_mutations": _trim_mutations(schema_lethal, limit=3),
                    "top_reasons": top_reasons,
                },
            )
        )
        covered_tools.add(schema_top_tool)

    if timeout_lethal:
        timeout_top_tool = _tool_from_lethal(timeout_lethal) or top_tool or "replay.tool"
        timeout_failures = sum(_int(item.get("failures")) for item in timeout_lethal)
        insights.append(
            _insight(
                insight_id=f"insight.timeout_retry.{_slug(timeout_top_tool)}",
                title=f"Handle TimeoutError in {timeout_top_tool}",
                recommendation=(
                    f"Catch TimeoutError from {timeout_top_tool}, retry with jittered "
                    "exponential backoff, and set a hard cap on retry attempts to prevent "
                    "runaway latency."
                ),
                why=(
                    f"Timeout mutations are linked to {timeout_failures} failed attempts "
                    f"on {timeout_top_tool}; the agent currently propagates the error "
                    "without retrying."
                ),
                confidence=_confidence(0.70, boost=boost),
                evidence={
                    "top_tools": _trim_tools_from_lethal(timeout_lethal, limit=3),
                    "top_mutations": _trim_mutations(timeout_lethal, limit=3),
                    "top_reasons": top_reasons,
                },
            )
        )
        covered_tools.add(timeout_top_tool)

    if rate_limit_lethal:
        rate_limit_top_tool = _tool_from_lethal(rate_limit_lethal) or top_tool or "replay.tool"
        rate_limit_failures = sum(_int(item.get("failures")) for item in rate_limit_lethal)
        insights.append(
            _insight(
                insight_id=f"insight.rate_limit_backoff.{_slug(rate_limit_top_tool)}",
                title=f"Add backoff and retry on 429s for {rate_limit_top_tool}",
                recommendation=(
                    f"Classify RateLimitError (HTTP 429) from {rate_limit_top_tool} as "
                    "retryable, respect Retry-After headers where available, and cap retry "
                    "attempts with exponential backoff."
                ),
                why=(
                    f"Rate-limit mutations are linked to {rate_limit_failures} failed attempts "
                    f"on {rate_limit_top_tool}; the agent does not back off before retrying."
                ),
                confidence=_confidence(0.66, boost=boost),
                evidence={
                    "top_tools": _trim_tools_from_lethal(rate_limit_lethal, limit=3),
                    "top_mutations": _trim_mutations(rate_limit_lethal, limit=3),
                    "top_reasons": top_reasons,
                },
            )
        )
        covered_tools.add(rate_limit_top_tool)

    if poison_lethal:
        poison_top_tool = _tool_from_lethal(poison_lethal) or top_tool or "replay.tool"
        insights.append(
            _insight(
                insight_id=f"insight.output_sanitizer.{_slug(poison_top_tool)}",
                title="Add output sanitizer and trust-zone boundaries",
                recommendation=(
                    "Strip instruction-like payloads from tool output, isolate untrusted fields, "
                    "and apply strict allowlists before prompt re-injection."
                ),
                why="poison.inject appears in lethal mutations with downstream failures.",
                confidence=_confidence(0.64, boost=boost),
                evidence={
                    "top_tools": _trim_tools_from_lethal(poison_lethal, limit=3),
                    "top_mutations": _trim_mutations(poison_lethal, limit=3),
                    "top_reasons": top_reasons,
                },
            )
        )

    hot_tool = _hot_tool(failures_by_tool)
    if hot_tool is not None:
        tool_name = str(hot_tool.get("tool") or "replay.tool")
        if tool_name in covered_tools:
            hot_tool = None

    if hot_tool is not None:
        tool_name = str(hot_tool.get("tool") or "replay.tool")
        fail_count = _int(hot_tool.get("count"))
        fail_pct = _float(hot_tool.get("pct"))
        if tool_name == "replay.execute":
            title = "Stabilize replay.execute integration path"
            recommendation = (
                "Validate replay payloads before execution, enforce typed replay result "
                "contracts, and classify replay-contract failures separately from "
                "downstream tool errors."
            )
        else:
            title = f"Stabilize {tool_name} integration path"
            recommendation = (
                f"Add tool-specific guardrails for {tool_name}: argument validation, "
                "typed response contracts, and clearer error classification."
            )
        insights.append(
            _insight(
                insight_id=f"insight.tool_hotspot.{_slug(tool_name)}",
                title=title,
                recommendation=recommendation,
                why=(
                    f"{tool_name} accounts for {fail_count} failed attempts "
                    f"({round(fail_pct * 100, 1)}% of failures)."
                ),
                confidence=_confidence(0.56, boost=boost),
                evidence={
                    "top_tools": _trim_tools(failures_by_tool, limit=3),
                    "top_mutations": top_mutations,
                    "top_reasons": top_reasons,
                },
            )
        )

    insights.sort(key=lambda item: (-item["confidence"], item["id"]))
    return insights


def _insight(
    *,
    insight_id: str,
    title: str,
    recommendation: str,
    why: str,
    confidence: float,
    evidence: dict[str, Any],
) -> dict[str, Any]:
    return {
        "id": insight_id,
        "title": title,
        "recommendation": recommendation,
        "why": why,
        "confidence": confidence,
        "evidence": evidence,
    }


def _top_failure_tool(failures_by_tool: list[dict[str, Any]]) -> str | None:
    if not failures_by_tool:
        return None
    tool = failures_by_tool[0].get("tool")
    if isinstance(tool, str) and tool:
        return tool
    return None


def _hot_tool(failures_by_tool: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not failures_by_tool:
        return None
    top = failures_by_tool[0]
    count = _int(top.get("count"))
    pct = _float(top.get("pct"))
    if count >= 2 and pct >= 0.4:
        return top
    return None


def _trim_tools(items: list[dict[str, Any]], *, limit: int) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for item in items[:limit]:
        tool = item.get("tool")
        if not isinstance(tool, str) or not tool:
            continue
        result.append({"tool": tool, "count": _int(item.get("count"))})
    return result


def _trim_tools_from_lethal(items: list[dict[str, Any]], *, limit: int) -> list[dict[str, Any]]:
    tools: list[dict[str, Any]] = []
    for item in items:
        top_tools = item.get("top_tools")
        if not isinstance(top_tools, list):
            continue
        for top_tool in top_tools:
            if not isinstance(top_tool, dict):
                continue
            tool = top_tool.get("tool")
            if not isinstance(tool, str) or not tool:
                continue
            tools.append({"tool": tool, "count": _int(top_tool.get("count"))})
    tools.sort(key=lambda row: (-row["count"], row["tool"]))
    deduped: list[dict[str, Any]] = []
    seen: set[str] = set()
    for row in tools:
        tool = row["tool"]
        if tool in seen:
            continue
        seen.add(tool)
        deduped.append(row)
        if len(deduped) >= limit:
            break
    return deduped


def _trim_mutations(items: list[dict[str, Any]], *, limit: int) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for item in items[:limit]:
        mutation_id = item.get("mutation_id")
        if not isinstance(mutation_id, str) or not mutation_id:
            continue
        result.append(
            {"mutation_id": mutation_id, "count": _int(item.get("failures") or item.get("count"))}
        )
    return result


def _trim_reasons(items: list[dict[str, Any]], *, limit: int) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for item in items[:limit]:
        reason = item.get("reason")
        if not isinstance(reason, str) or not reason:
            continue
        result.append({"reason": reason, "count": _int(item.get("count"))})
    return result


def _tool_from_lethal(items: list[dict[str, Any]]) -> str | None:
    for item in items:
        top_tools = item.get("top_tools")
        if not isinstance(top_tools, list) or not top_tools:
            continue
        first = top_tools[0]
        if isinstance(first, dict):
            tool = first.get("tool")
            if isinstance(tool, str) and tool:
                return tool
    return None


def _counterfactual_boost(*, total: int, passed: int) -> float:
    if total <= 0:
        return 0.0
    pass_rate = passed / total
    if pass_rate >= 0.5:
        return 0.08
    if pass_rate > 0.0:
        return 0.04
    return 0.0


def _confidence(base: float, *, boost: float = 0.0, extra: float = 0.0) -> float:
    return round(min(0.95, max(0.0, base + boost + extra)), 2)


def _safe_percent(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round((numerator / denominator) * 100, 1)


def _slug(value: str) -> str:
    lowered = value.lower()
    chars = []
    for char in lowered:
        if char.isalnum():
            chars.append(char)
        else:
            chars.append(".")
    raw = "".join(chars).strip(".")
    parts = [part for part in raw.split(".") if part]
    return ".".join(parts) or "tool"


def _int(value: Any) -> int:
    if isinstance(value, bool):
        return 0
    if isinstance(value, int):
        return max(0, value)
    if isinstance(value, float):
        return max(0, int(value))
    return 0


def _float(value: Any) -> float:
    if isinstance(value, bool):
        return 0.0
    if isinstance(value, int | float):
        return float(value)
    return 0.0


def _is_schema_mutation(mutation_id: str) -> bool:
    """Match schema-type mutations regardless of pack namespace."""
    lower = mutation_id.lower()
    return lower.startswith("schema.") or "rename" in lower or "schema" in lower


def _is_timeout_mutation(mutation_id: str) -> bool:
    """Match timeout mutations regardless of pack namespace."""
    lower = mutation_id.lower()
    return lower == "fault.timeout" or "timeout" in lower


def _is_rate_limit_mutation(mutation_id: str) -> bool:
    """Match rate-limit mutations regardless of pack namespace."""
    lower = mutation_id.lower()
    return lower == "fault.rate_limit" or "rate_limit" in lower


def _is_poison_mutation(mutation_id: str) -> bool:
    """Match prompt injection mutations regardless of pack namespace."""
    lower = mutation_id.lower()
    return lower == "poison.inject" or "poison" in lower or "inject" in lower
