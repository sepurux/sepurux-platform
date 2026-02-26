from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from models import ReplayAttempt
from replayer import (
    PolicyGateConfig,
    ReplayAdapterConfig,
    RetryPolicyConfig,
    build_attempt_replay_outcome,
)

IRREVERSIBLE_TOOLS = frozenset(
    {
        "jira.create_issue",
        "github.merge_pr",
        "github.create_pr",
        "payments.charge_card",
        "slack.send_message",
    }
)


@dataclass(frozen=True)
class CounterfactualReplayResult:
    strategy: str
    result: str
    failure_reason: str | None
    metrics: dict[str, Any]
    diff: dict[str, Any]


def run_counterfactual_replays(
    *,
    run_id: UUID,
    attempt: ReplayAttempt,
    mutation: Any,
    trace_s3_key: str,
) -> list[CounterfactualReplayResult]:
    if (attempt.result or "").lower() not in {"fail", "failed"}:
        return []

    return [
        _run_schema_adapter_v1(
            run_id=run_id, attempt=attempt, mutation=mutation, trace_s3_key=trace_s3_key
        ),
        _run_retry_cap_v1(
            run_id=run_id, attempt=attempt, mutation=mutation, trace_s3_key=trace_s3_key
        ),
        _run_policy_gate_v1(
            run_id=run_id, attempt=attempt, mutation=mutation, trace_s3_key=trace_s3_key
        ),
    ]


def _run_schema_adapter_v1(
    *, run_id: UUID, attempt: ReplayAttempt, mutation: Any, trace_s3_key: str
) -> CounterfactualReplayResult:
    adapter_config = ReplayAdapterConfig(
        mappings={
            "title": "name",
            "name": "title",
            "issue_id": "id",
            "id": "issue_id",
            "status_code": "status",
        }
    )
    outcome = build_attempt_replay_outcome(
        run_id=run_id,
        attempt_id=attempt.attempt_id,
        mutation=mutation,
        trace_s3_key=trace_s3_key,
        default_mutation_id=attempt.mutation_id,
        adapter_config=adapter_config,
    )
    metrics = {
        "duration_ms": _estimate_duration_ms(
            strategy="schema_adapter_v1", outcome=outcome, retry_count=0
        ),
        "retries": 0,
    }
    diff = {
        "kind": "tool_result_adapter",
        "adapter_version": "v1",
        "field_mappings": adapter_config.mappings,
        "changed_behavior": "post_process_tool_result",
        "baseline": {
            "result": _normalize_result(attempt.result),
            "failure_reason": attempt.failure_reason,
        },
    }
    return CounterfactualReplayResult(
        strategy="schema_adapter_v1",
        result=_normalize_result(outcome.result),
        failure_reason=outcome.failure_reason,
        metrics=metrics,
        diff=diff,
    )


def _run_retry_cap_v1(
    *, run_id: UUID, attempt: ReplayAttempt, mutation: Any, trace_s3_key: str
) -> CounterfactualReplayResult:
    retry_policy = RetryPolicyConfig(max_retries=2, backoff_ms=250)
    outcome = build_attempt_replay_outcome(
        run_id=run_id,
        attempt_id=attempt.attempt_id,
        mutation=mutation,
        trace_s3_key=trace_s3_key,
        default_mutation_id=attempt.mutation_id,
        retry_policy=retry_policy,
    )
    retries_used = _extract_retry_count(outcome.timeline_artifact)
    metrics = {
        "duration_ms": _estimate_duration_ms(
            strategy="retry_cap_v1", outcome=outcome, retry_count=retries_used
        ),
        "retries": retries_used,
    }
    diff = {
        "kind": "retry_policy",
        "policy_version": "v1",
        "max_retries": retry_policy.max_retries,
        "backoff_ms": retry_policy.backoff_ms,
        "changed_behavior": "override_retry_policy",
        "baseline": {
            "result": _normalize_result(attempt.result),
            "failure_reason": attempt.failure_reason,
        },
    }
    return CounterfactualReplayResult(
        strategy="retry_cap_v1",
        result=_normalize_result(outcome.result),
        failure_reason=outcome.failure_reason,
        metrics=metrics,
        diff=diff,
    )


def _run_policy_gate_v1(
    *, run_id: UUID, attempt: ReplayAttempt, mutation: Any, trace_s3_key: str
) -> CounterfactualReplayResult:
    policy_gate = PolicyGateConfig(
        irreversible_tools=IRREVERSIBLE_TOOLS, require_confirmation_token=True
    )
    outcome = build_attempt_replay_outcome(
        run_id=run_id,
        attempt_id=attempt.attempt_id,
        mutation=mutation,
        trace_s3_key=trace_s3_key,
        default_mutation_id=attempt.mutation_id,
        policy_gate=policy_gate,
    )
    metrics = {
        "duration_ms": _estimate_duration_ms(
            strategy="policy_gate_v1", outcome=outcome, retry_count=0
        ),
        "retries": 0,
    }
    diff = {
        "kind": "policy_gate",
        "policy_version": "v1",
        "irreversible_tools": sorted(policy_gate.irreversible_tools),
        "requires_confirmation_token": policy_gate.require_confirmation_token,
        "changed_behavior": "block_irreversible_calls_without_confirmation",
        "baseline": {
            "result": _normalize_result(attempt.result),
            "failure_reason": attempt.failure_reason,
        },
    }
    return CounterfactualReplayResult(
        strategy="policy_gate_v1",
        result=_normalize_result(outcome.result),
        failure_reason=outcome.failure_reason,
        metrics=metrics,
        diff=diff,
    )


def _normalize_result(result: str | None) -> str:
    return "pass" if (result or "").lower() in {"pass", "passed"} else "fail"


def _extract_retry_count(timeline_artifact: dict[str, Any]) -> int:
    events = timeline_artifact.get("events")
    if not isinstance(events, list):
        return 0
    for event in events:
        if not isinstance(event, dict) or event.get("type") != "tool_result":
            continue
        result = event.get("result")
        if isinstance(result, dict) and isinstance(result.get("retries"), int):
            return int(result["retries"])
    return 0


def _estimate_duration_ms(*, strategy: str, outcome, retry_count: int) -> int:
    base = {
        "schema_adapter_v1": 22,
        "retry_cap_v1": 30,
        "policy_gate_v1": 14,
    }.get(strategy, 20)
    events = (
        outcome.timeline_artifact.get("events")
        if isinstance(outcome.timeline_artifact, dict)
        else []
    )
    event_count = len(events) if isinstance(events, list) else 0
    penalty = 8 if _normalize_result(outcome.result) == "fail" else 0
    return base + (retry_count * 12) + event_count + penalty
