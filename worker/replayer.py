from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID


@dataclass(frozen=True)
class ReplayAdapterConfig:
    mappings: dict[str, str] | None = None


@dataclass(frozen=True)
class RetryPolicyConfig:
    max_retries: int = 0
    backoff_ms: int = 0


@dataclass(frozen=True)
class PolicyGateConfig:
    irreversible_tools: frozenset[str]
    require_confirmation_token: bool = True


@dataclass(frozen=True)
class AttemptReplayOutcome:
    mutation_id: str
    result: str
    failure_reason: str | None
    first_failure_event_index: int | None
    first_failure_tool: str | None
    timeline_artifact: dict[str, Any]


def iter_mutations(mutation_set: Any) -> list[Any]:
    if isinstance(mutation_set, list):
        return mutation_set or [{"mutation_id": "baseline"}]
    if isinstance(mutation_set, dict):
        mutations = mutation_set.get("mutations")
        if isinstance(mutations, list):
            return mutations or [{"mutation_id": "baseline"}]
        return [mutation_set]
    if mutation_set is None:
        return [{"mutation_id": "baseline"}]
    return [mutation_set]


def build_attempt_replay_outcome(
    *,
    run_id: UUID,
    attempt_id: UUID,
    mutation: Any,
    trace_s3_key: str,
    default_mutation_id: str,
    adapter_config: ReplayAdapterConfig | None = None,
    retry_policy: RetryPolicyConfig | None = None,
    policy_gate: PolicyGateConfig | None = None,
) -> AttemptReplayOutcome:
    mutation_obj = mutation if isinstance(mutation, dict) else {"value": mutation}
    tool_name = str(mutation_obj.get("tool") or "replay.execute")
    mutation_id = str(mutation_obj.get("mutation_id") or mutation_obj.get("id") or default_mutation_id)
    compact_args = _compact_json(mutation_obj.get("args") or mutation_obj, max_items=8, max_string=240)
    should_fail = bool(mutation_obj.get("force_fail") or mutation_obj.get("should_fail"))
    failure_reason = str(mutation_obj.get("failure_reason") or "simulated_failure") if should_fail else None
    retry_policy = retry_policy or RetryPolicyConfig()

    events: list[dict[str, Any]] = [
        {
            "index": 0,
            "type": "tool_call",
            "tool": "trace.load",
            "args": {"s3_key": trace_s3_key},
        },
        {
            "index": 1,
            "type": "tool_result",
            "tool": "trace.load",
            "result": {"ok": True},
        },
        {
            "index": 2,
            "type": "tool_call",
            "tool": tool_name,
            "args": {"mutation_id": mutation_id, "mutation": compact_args},
        },
    ]

    if _should_block_by_policy(policy_gate, tool_name=tool_name, mutation_obj=mutation_obj):
        events.append(
            {
                "index": 3,
                "type": "error",
                "tool": tool_name,
                "error": {
                    "type": "PolicyBlockedError",
                    "message": "Irreversible tool call blocked without confirmation_token",
                },
            }
        )
        first_failure = {"event_index": 3, "tool": tool_name, "reason": "policy_blocked"}
        return AttemptReplayOutcome(
            mutation_id=mutation_id,
            result="failed",
            failure_reason="policy_blocked",
            first_failure_event_index=first_failure["event_index"],
            first_failure_tool=first_failure["tool"],
            timeline_artifact={
                "timeline_version": "0.1",
                "run_id": str(run_id),
                "attempt_id": str(attempt_id),
                "mutation_id": mutation_id,
                "events": events,
                "first_failure": first_failure,
            },
        )

    retries_used = 0
    if should_fail and failure_reason is not None:
        required_retries = _required_retries_for_failure(failure_reason, mutation_obj)
        retries_used = min(retry_policy.max_retries, required_retries)
        if _retry_policy_recovers_failure(
            failure_reason=failure_reason,
            mutation_obj=mutation_obj,
            retry_policy=retry_policy,
            required_retries=required_retries,
        ):
            should_fail = False
            failure_reason = None

    adapter_applied = False
    if should_fail and failure_reason is not None and adapter_config is not None:
        if _schema_adapter_recovers_failure(failure_reason=failure_reason, mutation_obj=mutation_obj, adapter_config=adapter_config):
            adapter_applied = True
            should_fail = False
            failure_reason = None

    first_failure: dict[str, Any] | None = None
    if should_fail:
        events.append(
            {
                "index": 3,
                "type": "error",
                "tool": tool_name,
                "error": {
                    "type": str(mutation_obj.get("error_type") or "ReplayError"),
                    "message": str(mutation_obj.get("error_message") or "simulated replay failure"),
                },
            }
        )
        first_failure = {
            "event_index": 3,
            "tool": tool_name,
            "reason": failure_reason,
        }
        result = "failed"
    else:
        tool_result: dict[str, Any] = {"ok": True, "status": "replayed"}
        if retries_used > 0:
            tool_result["retries"] = retries_used
        if adapter_applied:
            tool_result["adapter"] = "schema_adapter_v1"
            tool_result["adapted_fields"] = _adapter_field_mappings(adapter_config, mutation_obj)
        events.append(
            {
                "index": 3,
                "type": "tool_result",
                "tool": tool_name,
                "result": tool_result,
            }
        )
        events.append(
            {
                "index": 4,
                "type": "model",
                "result": {"summary": f"Attempt {mutation_id} replayed successfully"},
            }
        )
        result = "passed"

    timeline_artifact = {
        "timeline_version": "0.1",
        "run_id": str(run_id),
        "attempt_id": str(attempt_id),
        "mutation_id": mutation_id,
        "events": events,
        "first_failure": first_failure,
    }

    return AttemptReplayOutcome(
        mutation_id=mutation_id,
        result=result,
        failure_reason=failure_reason,
        first_failure_event_index=first_failure["event_index"] if first_failure else None,
        first_failure_tool=first_failure["tool"] if first_failure else None,
        timeline_artifact=timeline_artifact,
    )


def _should_block_by_policy(
    policy_gate: PolicyGateConfig | None,
    *,
    tool_name: str,
    mutation_obj: dict[str, Any],
) -> bool:
    if policy_gate is None:
        return False
    if tool_name not in policy_gate.irreversible_tools:
        return False
    if not policy_gate.require_confirmation_token:
        return False
    args = mutation_obj.get("args")
    if isinstance(args, dict) and args.get("confirmation_token"):
        return False
    return not bool(mutation_obj.get("confirmation_token"))


def _required_retries_for_failure(failure_reason: str, mutation_obj: dict[str, Any]) -> int:
    if isinstance(mutation_obj.get("required_retries"), int):
        return max(0, int(mutation_obj["required_retries"]))
    if failure_reason == "timeout":
        return 2
    if failure_reason == "rate_limited":
        return 3
    return 1


def _retry_policy_recovers_failure(
    *,
    failure_reason: str,
    mutation_obj: dict[str, Any],
    retry_policy: RetryPolicyConfig,
    required_retries: int,
) -> bool:
    recoverable_reasons = {"timeout", "rate_limited", "transient_network"}
    if failure_reason not in recoverable_reasons:
        return False
    min_backoff_ms = int(mutation_obj.get("min_backoff_ms") or 0)
    if retry_policy.max_retries < required_retries:
        return False
    if retry_policy.backoff_ms < min_backoff_ms:
        return False
    return True


def _schema_adapter_recovers_failure(
    *,
    failure_reason: str,
    mutation_obj: dict[str, Any],
    adapter_config: ReplayAdapterConfig,
) -> bool:
    schema_failure_reasons = {"schema_drift", "schema_mismatch", "missing_field", "type_mismatch"}
    if failure_reason not in schema_failure_reasons:
        return False
    mappings = adapter_config.mappings or {}
    missing_field = str(mutation_obj.get("missing_field") or "")
    if missing_field and missing_field in mappings:
        return True
    expected_field = str(mutation_obj.get("expected_field") or "")
    if expected_field and expected_field in mappings:
        return True
    return bool(mappings) and bool(mutation_obj.get("tool"))


def _adapter_field_mappings(adapter_config: ReplayAdapterConfig | None, mutation_obj: dict[str, Any]) -> dict[str, str]:
    if adapter_config is None or not adapter_config.mappings:
        return {}
    mappings = adapter_config.mappings
    fields = []
    for key in ("missing_field", "expected_field"):
        value = mutation_obj.get(key)
        if isinstance(value, str) and value in mappings:
            fields.append(value)
    if not fields:
        fields = list(mappings.keys())[:2]
    return {field: mappings[field] for field in fields if field in mappings}


def _compact_json(value: Any, *, max_items: int = 10, max_string: int = 256, depth: int = 0) -> Any:
    if depth > 2:
        return "<truncated-depth>"
    if isinstance(value, dict):
        items = list(value.items())[:max_items]
        compact = {str(k): _compact_json(v, max_items=max_items, max_string=max_string, depth=depth + 1) for k, v in items}
        if len(value) > max_items:
            compact["__truncated__"] = len(value) - max_items
        return compact
    if isinstance(value, list):
        items = [_compact_json(v, max_items=max_items, max_string=max_string, depth=depth + 1) for v in value[:max_items]]
        if len(value) > max_items:
            items.append({"__truncated__": len(value) - max_items})
        return items
    if isinstance(value, str):
        return value if len(value) <= max_string else f"{value[:max_string]}...<truncated>"
    return value
