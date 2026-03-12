from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from policy_engine import has_confirmation_token, normalize_action


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
class ReplayExecutionConfig:
    require_tool_name: bool = True
    require_args_dict: bool = True
    require_typed_response_contract: bool = True
    required_result_fields: frozenset[str] = frozenset({"ok", "status", "tool", "mutation_id"})


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
    replay_config: ReplayExecutionConfig | None = None,
) -> AttemptReplayOutcome:
    mutation_obj = mutation if isinstance(mutation, dict) else {"value": mutation}
    mutation_id = str(
        mutation_obj.get("mutation_id") or mutation_obj.get("id") or default_mutation_id
    )
    replay_config = replay_config or ReplayExecutionConfig()
    tool_name = _extract_tool_name(mutation_obj)
    tool_args, args_contract_valid = _extract_tool_args(mutation_obj)
    compact_payload = _compact_json(mutation_obj, max_items=8, max_string=240)
    should_fail = bool(mutation_obj.get("force_fail") or mutation_obj.get("should_fail"))
    failure_reason = (
        str(mutation_obj.get("failure_reason") or "simulated_failure") if should_fail else None
    )
    retry_policy = retry_policy or RetryPolicyConfig()

    contract_failure = _replay_contract_failure(
        mutation_id=mutation_id,
        tool_name=tool_name,
        args_contract_valid=args_contract_valid,
        compact_payload=compact_payload,
        replay_config=replay_config,
        run_id=run_id,
        attempt_id=attempt_id,
        trace_s3_key=trace_s3_key,
    )
    if contract_failure is not None:
        return contract_failure

    resolved_tool_name = tool_name or "replay.execute"
    resolved_tool_args = tool_args or {}

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
            "tool": resolved_tool_name,
            "args": resolved_tool_args,
        },
    ]

    if _should_block_by_policy(
        policy_gate,
        tool_name=resolved_tool_name,
        mutation_obj=mutation_obj,
    ):
        events.append(
            {
                "index": 3,
                "type": "error",
                "tool": resolved_tool_name,
                "error": {
                    "type": "PolicyBlockedError",
                    "message": "Irreversible tool call blocked without confirmation_token",
                },
            }
        )
        policy_first_failure_event_index = 3
        policy_first_failure_tool = resolved_tool_name
        policy_first_failure: dict[str, Any] = {
            "event_index": policy_first_failure_event_index,
            "tool": policy_first_failure_tool,
            "reason": "policy_blocked",
        }
        return AttemptReplayOutcome(
            mutation_id=mutation_id,
            result="failed",
            failure_reason="policy_blocked",
            first_failure_event_index=policy_first_failure_event_index,
            first_failure_tool=policy_first_failure_tool,
            timeline_artifact={
                "timeline_version": "0.1",
                "run_id": str(run_id),
                "attempt_id": str(attempt_id),
                "mutation_id": mutation_id,
                "events": events,
                "first_failure": policy_first_failure,
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
        if _schema_adapter_recovers_failure(
            failure_reason=failure_reason, mutation_obj=mutation_obj, adapter_config=adapter_config
        ):
            adapter_applied = True
            should_fail = False
            failure_reason = None

    first_failure: dict[str, Any] | None = None
    first_failure_event_index: int | None = None
    first_failure_tool: str | None = None
    if should_fail:
        events.append(
            {
                "index": 3,
                "type": "error",
                "tool": resolved_tool_name,
                "error": {
                    "type": str(mutation_obj.get("error_type") or "ReplayError"),
                    "message": str(mutation_obj.get("error_message") or "simulated replay failure"),
                    "classification": "tool_execution",
                },
            }
        )
        first_failure_event_index = 3
        first_failure_tool = resolved_tool_name
        first_failure = {
            "event_index": first_failure_event_index,
            "tool": first_failure_tool,
            "reason": failure_reason,
        }
        result = "failed"
    else:
        tool_result, response_contract_error = _build_typed_tool_result(
            mutation_id=mutation_id,
            mutation_obj=mutation_obj,
            replay_config=replay_config,
            tool_name=resolved_tool_name,
        )
        if response_contract_error is not None:
            return _build_replay_contract_failure(
                attempt_id=attempt_id,
                compact_payload=compact_payload,
                contract_reason=response_contract_error["reason"],
                contract_message=response_contract_error["message"],
                mutation_id=mutation_id,
                run_id=run_id,
                trace_s3_key=trace_s3_key,
                target_tool=resolved_tool_name,
            )
        assert tool_result is not None
        if retries_used > 0:
            tool_result["retries"] = retries_used
        if adapter_applied:
            tool_result["adapter"] = "schema_adapter_v1"
            tool_result["adapted_fields"] = _adapter_field_mappings(adapter_config, mutation_obj)
        events.append(
            {
                "index": 3,
                "type": "tool_result",
                "tool": resolved_tool_name,
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
        first_failure_event_index=first_failure_event_index,
        first_failure_tool=first_failure_tool,
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
    args = mutation_obj.get("args")
    args_obj = dict(args) if isinstance(args, dict) else {}
    top_level_confirmation_token = mutation_obj.get("confirmation_token")
    if (
        isinstance(top_level_confirmation_token, str)
        and top_level_confirmation_token
        and "confirmation_token" not in args_obj
    ):
        args_obj["confirmation_token"] = top_level_confirmation_token
    top_level_approval_token = mutation_obj.get("approval_token")
    if (
        isinstance(top_level_approval_token, str)
        and top_level_approval_token
        and "approval_token" not in args_obj
    ):
        args_obj["approval_token"] = top_level_approval_token

    normalized_tool_name, _ = normalize_action(tool_name, args_obj)
    if normalized_tool_name not in policy_gate.irreversible_tools:
        return False
    if not policy_gate.require_confirmation_token:
        return False
    return not has_confirmation_token(args_obj)


def _extract_tool_name(mutation_obj: dict[str, Any]) -> str | None:
    tool = mutation_obj.get("tool")
    if isinstance(tool, str) and tool.strip():
        return tool.strip()

    event_obj = mutation_obj.get("event")
    if isinstance(event_obj, dict):
        event_tool = event_obj.get("tool")
        if isinstance(event_tool, str) and event_tool.strip():
            return event_tool.strip()
    return None


def _extract_tool_args(mutation_obj: dict[str, Any]) -> tuple[dict[str, Any] | None, bool]:
    args = mutation_obj.get("args")
    if isinstance(args, dict):
        return dict(args), True
    if "args" in mutation_obj:
        event_obj = mutation_obj.get("event")
        if isinstance(event_obj, dict):
            event_args = event_obj.get("args")
            if isinstance(event_args, dict):
                return dict(event_args), True
        return None, False

    event_obj = mutation_obj.get("event")
    if isinstance(event_obj, dict):
        event_args = event_obj.get("args")
        if isinstance(event_args, dict):
            return dict(event_args), True
        if "args" in event_obj:
            return None, False

    return None, True


def _replay_contract_failure(
    *,
    mutation_id: str,
    tool_name: str | None,
    args_contract_valid: bool,
    compact_payload: dict[str, Any],
    replay_config: ReplayExecutionConfig,
    run_id: UUID,
    attempt_id: UUID,
    trace_s3_key: str,
) -> AttemptReplayOutcome | None:
    if replay_config.require_tool_name and not tool_name:
        return _build_replay_contract_failure(
            attempt_id=attempt_id,
            compact_payload=compact_payload,
            contract_reason="replay_contract_invalid_tool",
            contract_message=(
                "Replay mutation is missing a target tool. " "Provide mutation.tool or event.tool."
            ),
            mutation_id=mutation_id,
            run_id=run_id,
            trace_s3_key=trace_s3_key,
            target_tool=None,
        )
    if replay_config.require_args_dict and not args_contract_valid:
        return _build_replay_contract_failure(
            attempt_id=attempt_id,
            compact_payload=compact_payload,
            contract_reason="replay_contract_invalid_args",
            contract_message=(
                "Replay mutation args must be an object when provided. "
                "Use mutation.args or event.args as a JSON object."
            ),
            mutation_id=mutation_id,
            run_id=run_id,
            trace_s3_key=trace_s3_key,
            target_tool=tool_name,
        )
    return None


def _build_replay_contract_failure(
    *,
    attempt_id: UUID,
    compact_payload: dict[str, Any],
    contract_reason: str,
    contract_message: str,
    mutation_id: str,
    run_id: UUID,
    trace_s3_key: str,
    target_tool: str | None,
) -> AttemptReplayOutcome:
    events = [
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
            "tool": "replay.execute",
            "args": {
                "mutation_id": mutation_id,
                "target_tool": target_tool,
                "mutation": compact_payload,
            },
        },
        {
            "index": 3,
            "type": "error",
            "tool": "replay.execute",
            "error": {
                "type": "ReplayContractError",
                "code": contract_reason,
                "classification": "contract_validation",
                "retryable": False,
                "message": contract_message,
            },
        },
    ]
    first_failure = {
        "event_index": 3,
        "tool": "replay.execute",
        "reason": contract_reason,
    }
    return AttemptReplayOutcome(
        mutation_id=mutation_id,
        result="failed",
        failure_reason=contract_reason,
        first_failure_event_index=3,
        first_failure_tool="replay.execute",
        timeline_artifact={
            "timeline_version": "0.1",
            "run_id": str(run_id),
            "attempt_id": str(attempt_id),
            "mutation_id": mutation_id,
            "events": events,
            "first_failure": first_failure,
        },
    )


def _build_typed_tool_result(
    *,
    mutation_id: str,
    mutation_obj: dict[str, Any],
    replay_config: ReplayExecutionConfig,
    tool_name: str,
) -> tuple[dict[str, Any] | None, dict[str, str] | None]:
    raw_result = mutation_obj.get("tool_result")
    if raw_result is None:
        result_obj: dict[str, Any] = {}
    elif isinstance(raw_result, dict):
        result_obj = dict(raw_result)
    else:
        return None, {
            "reason": "replay_contract_invalid_response",
            "message": "Replay tool_result must be an object when provided.",
        }

    ok_value = result_obj.get("ok")
    if ok_value is not None and not isinstance(ok_value, bool):
        return None, {
            "reason": "replay_contract_invalid_response",
            "message": "Replay tool_result.ok must be a boolean.",
        }
    status_value = result_obj.get("status")
    if status_value is not None and (not isinstance(status_value, str) or not status_value.strip()):
        return None, {
            "reason": "replay_contract_invalid_response",
            "message": "Replay tool_result.status must be a non-empty string.",
        }
    tool_value = result_obj.get("tool")
    if tool_value is not None and tool_value != tool_name:
        return None, {
            "reason": "replay_contract_invalid_response",
            "message": "Replay tool_result.tool must match the replay target tool.",
        }
    mutation_value = result_obj.get("mutation_id")
    if mutation_value is not None and str(mutation_value) != mutation_id:
        return None, {
            "reason": "replay_contract_invalid_response",
            "message": "Replay tool_result.mutation_id must match the replay mutation id.",
        }

    result_obj.setdefault("ok", True)
    result_obj.setdefault("status", "replayed")
    result_obj["tool"] = tool_name
    result_obj["mutation_id"] = mutation_id
    result_obj["contract"] = {
        "kind": "replay.execute.result",
        "version": "0.1",
        "validated": replay_config.require_typed_response_contract,
    }

    if replay_config.require_typed_response_contract:
        missing_fields = sorted(
            field for field in replay_config.required_result_fields if field not in result_obj
        )
        if missing_fields:
            return None, {
                "reason": "replay_contract_invalid_response",
                "message": (
                    "Replay tool_result is missing required field(s): " + ", ".join(missing_fields)
                ),
            }
    return result_obj, None


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


def _adapter_field_mappings(
    adapter_config: ReplayAdapterConfig | None, mutation_obj: dict[str, Any]
) -> dict[str, str]:
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
        dict_items = list(value.items())[:max_items]
        compact = {
            str(k): _compact_json(v, max_items=max_items, max_string=max_string, depth=depth + 1)
            for k, v in dict_items
        }
        if len(value) > max_items:
            compact["__truncated__"] = len(value) - max_items
        return compact
    if isinstance(value, list):
        list_items = [
            _compact_json(v, max_items=max_items, max_string=max_string, depth=depth + 1)
            for v in value[:max_items]
        ]
        if len(value) > max_items:
            list_items.append({"__truncated__": len(value) - max_items})
        return list_items
    if isinstance(value, str):
        return value if len(value) <= max_string else f"{value[:max_string]}...<truncated>"
    return value
