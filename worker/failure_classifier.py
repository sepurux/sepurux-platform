from __future__ import annotations

from dataclasses import dataclass
from typing import Any

FAILURE_TYPES = frozenset(
    {
        "prompt_injection",
        "tool_schema_error",
        "tool_timeout",
        "json_parse_error",
        "policy_violation",
        "retry_loop",
        "latency_exceeded",
        "unsafe_tool_call",
        "unknown_failure",
    }
)

SEVERITY_LEVELS = frozenset({"critical", "high", "medium", "low"})
SCHEMA_FAILURE_REASONS = frozenset(
    {"schema_drift", "schema_mismatch", "missing_field", "type_mismatch"}
)
POLICY_FAILURE_REASONS = frozenset(
    {"policy_blocked", "policy_denied", "policy_requires_approval", "opa_unavailable"}
)
JSON_FAILURE_REASONS = frozenset(
    {"json_decode_error", "json_parse_error", "replay_contract_invalid_response"}
)


@dataclass(frozen=True)
class FailureClassificationInput:
    failure_reason: str | None
    first_failure_tool: str | None
    first_failure_event_index: int | None
    timeline_artifact: dict[str, Any]
    mutation_trace: dict[str, Any] | None
    policy_events: list[dict[str, Any]]
    security_events: list[dict[str, Any]]
    mutation_name: str


@dataclass(frozen=True)
class FailureClassification:
    failure_type: str
    severity: str
    description: str
    metadata: dict[str, Any]


def classify_attempt_failure(input: FailureClassificationInput) -> FailureClassification:
    step = _step_from_timeline(
        input.timeline_artifact,
        event_index=input.first_failure_event_index,
    )
    classified = classify_failure(step, input)
    if classified is not None:
        return classified

    return FailureClassification(
        failure_type="unknown_failure",
        severity="low",
        description="Sepurux could not map this failed replay to a known reliability category.",
        metadata=_base_metadata(step, input),
    )


def classify_failure(
    step: dict[str, Any] | None,
    result: FailureClassificationInput,
) -> FailureClassification | None:
    lower_output = _extract_output_text(step).lower()
    security_action = _first_matching_security_action(result.security_events)
    failure_reason = (result.failure_reason or "").strip().lower()
    latency_ms = _extract_latency_ms(step, result.mutation_trace)
    error_code = _extract_error_code(step)
    error_message = _extract_error_message(step).lower()
    mutation_types = _mutation_types(result.mutation_trace)

    if (
        "ignore previous instructions" in lower_output
        or failure_reason == "prompt_injection_blocked"
        or security_action == "block"
    ):
        return FailureClassification(
            failure_type="prompt_injection",
            severity="critical",
            description="Prompt injection content reached the replay path and triggered a security block.",
            metadata=_base_metadata(
                step, result, latency_ms=latency_ms, security_action=security_action
            ),
        )

    if security_action == "block":
        return FailureClassification(
            failure_type="unsafe_tool_call",
            severity="critical",
            description="An unsafe tool interaction was blocked by the Sepurux security layer.",
            metadata=_base_metadata(
                step, result, latency_ms=latency_ms, security_action=security_action
            ),
        )

    if (
        failure_reason in JSON_FAILURE_REASONS
        or error_code in JSON_FAILURE_REASONS
        or "json" in error_message
    ):
        return FailureClassification(
            failure_type="json_parse_error",
            severity="high",
            description="The replay failed because a tool response or contract payload could not be parsed as valid JSON.",
            metadata=_base_metadata(step, result, latency_ms=latency_ms, error_code=error_code),
        )

    if failure_reason in SCHEMA_FAILURE_REASONS or _has_schema_mutation(mutation_types):
        return FailureClassification(
            failure_type="tool_schema_error",
            severity="high",
            description="A tool schema mismatch or missing field broke the replayed workflow.",
            metadata=_base_metadata(step, result, latency_ms=latency_ms),
        )

    if _is_tool_timeout(step, failure_reason):
        return FailureClassification(
            failure_type="tool_timeout",
            severity="high",
            description="The workflow failed because a replayed tool call timed out.",
            metadata=_base_metadata(step, result, latency_ms=latency_ms),
        )

    if failure_reason in POLICY_FAILURE_REASONS:
        return FailureClassification(
            failure_type="policy_violation",
            severity="high",
            description="A policy gate denied or blocked the replayed action.",
            metadata=_base_metadata(step, result, latency_ms=latency_ms),
        )

    if failure_reason == "rate_limited":
        return FailureClassification(
            failure_type="retry_loop",
            severity="medium",
            description="The workflow entered a retryable failure mode and exhausted useful retries.",
            metadata=_base_metadata(step, result, latency_ms=latency_ms),
        )

    if latency_ms is not None and latency_ms > 5000:
        return FailureClassification(
            failure_type="latency_exceeded",
            severity="medium",
            description="The replay exceeded the Sepurux latency threshold for a stable tool execution.",
            metadata=_base_metadata(step, result, latency_ms=latency_ms),
        )

    if security_action in {"sanitize", "allow"} and _has_high_risk_security_event(
        result.security_events
    ):
        return FailureClassification(
            failure_type="unsafe_tool_call",
            severity="critical",
            description="A tool interaction crossed the configured Sepurux security risk threshold.",
            metadata=_base_metadata(
                step, result, latency_ms=latency_ms, security_action=security_action
            ),
        )

    return None


def _step_from_timeline(
    timeline_artifact: dict[str, Any],
    *,
    event_index: int | None,
) -> dict[str, Any] | None:
    events = timeline_artifact.get("events")
    if not isinstance(events, list):
        return None
    for event in events:
        if not isinstance(event, dict):
            continue
        if event_index is None:
            continue
        if event.get("index") == event_index:
            return event
    return None


def _extract_output_text(step: dict[str, Any] | None) -> str:
    if not isinstance(step, dict):
        return ""
    for key in ("result", "output", "error"):
        value = step.get(key)
        text = _stringify_textish(value)
        if text:
            return text
    return ""


def _extract_latency_ms(
    step: dict[str, Any] | None,
    mutation_trace: dict[str, Any] | None,
) -> int | None:
    if isinstance(step, dict):
        for key in ("latency_ms",):
            value = step.get(key)
            if isinstance(value, int | float) and not isinstance(value, bool):
                return int(value)
        result = step.get("result")
        if isinstance(result, dict):
            value = result.get("latency_ms")
            if isinstance(value, int | float) and not isinstance(value, bool):
                return int(value)

    if isinstance(mutation_trace, dict):
        applied = mutation_trace.get("applied")
        if isinstance(applied, list):
            for item in applied:
                if not isinstance(item, dict):
                    continue
                details = item.get("details")
                if not isinstance(details, dict):
                    continue
                value = details.get("latency_ms")
                if isinstance(value, int | float) and not isinstance(value, bool):
                    return int(value)
    return None


def _extract_error_code(step: dict[str, Any] | None) -> str | None:
    if not isinstance(step, dict):
        return None
    error = step.get("error")
    if isinstance(error, dict):
        code = error.get("code")
        if isinstance(code, str) and code:
            return code.lower()
    return None


def _extract_error_message(step: dict[str, Any] | None) -> str:
    if not isinstance(step, dict):
        return ""
    error = step.get("error")
    if isinstance(error, dict):
        message = error.get("message")
        if isinstance(message, str):
            return message
    return ""


def _mutation_types(mutation_trace: dict[str, Any] | None) -> set[str]:
    if not isinstance(mutation_trace, dict):
        return set()
    applied = mutation_trace.get("applied")
    if not isinstance(applied, list):
        return set()
    types: set[str] = set()
    for item in applied:
        if not isinstance(item, dict):
            continue
        details = item.get("details")
        if isinstance(details, dict):
            mutation_type = details.get("type")
            if isinstance(mutation_type, str) and mutation_type:
                types.add(mutation_type)
    return types


def _has_schema_mutation(mutation_types: set[str]) -> bool:
    return any(mutation_type.startswith("schema.") for mutation_type in mutation_types)


def _is_tool_timeout(step: dict[str, Any] | None, failure_reason: str) -> bool:
    if failure_reason == "timeout":
        return True
    if isinstance(step, dict):
        return step.get("type") == "tool_call" and bool(step.get("timeout"))
    return False


def _first_matching_security_action(security_events: list[dict[str, Any]]) -> str | None:
    for event in security_events:
        if not isinstance(event, dict):
            continue
        action = event.get("action")
        if isinstance(action, str) and action:
            return action
    return None


def _has_high_risk_security_event(security_events: list[dict[str, Any]]) -> bool:
    for event in security_events:
        if not isinstance(event, dict):
            continue
        risk_score = event.get("risk_score")
        if isinstance(risk_score, int | float) and not isinstance(risk_score, bool):
            if float(risk_score) >= 0.7:
                return True
    return False


def _base_metadata(
    step: dict[str, Any] | None,
    result: FailureClassificationInput,
    *,
    latency_ms: int | None = None,
    security_action: str | None = None,
    error_code: str | None = None,
) -> dict[str, Any]:
    metadata: dict[str, Any] = {
        "failure_reason": result.failure_reason,
        "first_failure_tool": result.first_failure_tool,
        "first_failure_event_index": result.first_failure_event_index,
        "step_type": step.get("type") if isinstance(step, dict) else None,
        "tool": step.get("tool") if isinstance(step, dict) else None,
        "mutation_name": result.mutation_name,
    }
    if latency_ms is not None:
        metadata["latency_ms"] = latency_ms
    if security_action is not None:
        metadata["security_action"] = security_action
    if error_code is not None:
        metadata["error_code"] = error_code
    if result.policy_events:
        metadata["policy_event_count"] = len(result.policy_events)
    if result.security_events:
        metadata["security_event_count"] = len(result.security_events)
        metadata["security_matches"] = [
            event.get("matches")
            for event in result.security_events
            if isinstance(event, dict) and event.get("matches") is not None
        ]
    if isinstance(result.mutation_trace, dict):
        metadata["mutation_trace"] = result.mutation_trace
    return metadata


def _stringify_textish(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        parts: list[str] = []
        for nested_value in value.values():
            nested_text = _stringify_textish(nested_value)
            if nested_text:
                parts.append(nested_text)
        return " ".join(parts)
    if isinstance(value, list):
        return " ".join(_stringify_textish(item) for item in value if _stringify_textish(item))
    return ""
