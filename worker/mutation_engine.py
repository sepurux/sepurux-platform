from __future__ import annotations

import copy
import hashlib
import random
from dataclasses import dataclass
from fnmatch import fnmatchcase
from typing import Any
from uuid import UUID

INTERNAL_BOOTSTRAP_TOOLS = frozenset({"trace.load", "campaign.load"})


@dataclass(frozen=True)
class MutationApplicationResult:
    seed: int
    mutation_trace: dict[str, Any]
    timeline_artifact: dict[str, Any]
    forced_failure_reason: str | None
    first_failure_event_index: int | None
    first_failure_tool: str | None


@dataclass(frozen=True)
class _MutationDefinition:
    mutation_id: str
    mutation_type: str
    target_tool_pattern: str
    probability: float
    weight: float
    params: dict[str, Any]


def derive_seed(run_id: UUID | str, attempt_id: UUID | str, attempt_index: int) -> int:
    # Keep the signature backward compatible, but only derive from run + index
    # so replays are stable across regenerated attempt UUIDs.
    payload = f"{run_id}:{attempt_index}".encode()
    digest = hashlib.sha256(payload).digest()
    # Keep it in 31-bit range for JSON/db portability.
    return int.from_bytes(digest[:8], "big") & 0x7FFFFFFF


def apply_mutation_pack(
    mutation_pack_config: Any,
    *,
    run_id: UUID | str,
    attempt_id: UUID | str,
    attempt_index: int,
    timeline_artifact: dict[str, Any],
    seed: int | None = None,
) -> MutationApplicationResult:
    seed_value = seed if isinstance(seed, int) else derive_seed(run_id, attempt_id, attempt_index)
    rng = random.Random(seed_value)

    artifact = copy.deepcopy(timeline_artifact)
    events_value = artifact.get("events")
    events: list[dict[str, Any]] = []
    if isinstance(events_value, list):
        for item in events_value:
            if isinstance(item, dict):
                events.append(item)
    artifact["events"] = events

    definitions = _normalize_mutation_definitions(mutation_pack_config)
    max_mutations = _max_mutations_per_attempt(mutation_pack_config)
    selected = _select_mutations(definitions, rng=rng, max_mutations=max_mutations)

    applied: list[dict[str, Any]] = []
    forced_failure_reason: str | None = None
    first_failure_event_index: int | None = None
    first_failure_tool: str | None = None

    for definition in selected:
        applied_event, forced_failure = _apply_single_mutation(definition, events)
        if applied_event is None:
            continue
        applied.append(applied_event)
        if forced_failure is not None:
            forced_failure_reason = forced_failure["failure_reason"]
            first_failure_event_index = forced_failure["event_index"]
            first_failure_tool = forced_failure["tool"]
            artifact["first_failure"] = {
                "event_index": first_failure_event_index,
                "tool": first_failure_tool,
                "reason": forced_failure_reason,
            }
            break

    return MutationApplicationResult(
        seed=seed_value,
        mutation_trace={"seed": seed_value, "applied": applied},
        timeline_artifact=artifact,
        forced_failure_reason=forced_failure_reason,
        first_failure_event_index=first_failure_event_index,
        first_failure_tool=first_failure_tool,
    )


def _normalize_mutation_definitions(mutation_pack_config: Any) -> list[_MutationDefinition]:
    config_obj = mutation_pack_config if isinstance(mutation_pack_config, dict) else {}
    raw_mutations = config_obj.get("mutations")
    if not isinstance(raw_mutations, list):
        return []

    normalized: list[_MutationDefinition] = []
    for index, item in enumerate(raw_mutations):
        if not isinstance(item, dict):
            continue
        mutation_type = _mutation_type(item)
        if mutation_type is None:
            continue
        params = _extract_params(item)
        mutation_id_value = item.get("mutation_id")
        if not isinstance(mutation_id_value, str) or not mutation_id_value:
            fallback_id = item.get("id")
            if isinstance(fallback_id, str) and fallback_id:
                mutation_id_value = fallback_id
            else:
                mutation_id_value = f"{mutation_type}-{index}"

        target_tool_pattern = _target_tool_pattern(item)
        probability = _mutation_probability(item, params=params)
        weight = _coerce_weight(item.get("weight"), default=1.0)

        normalized.append(
            _MutationDefinition(
                mutation_id=mutation_id_value,
                mutation_type=mutation_type,
                target_tool_pattern=target_tool_pattern,
                probability=probability,
                weight=weight,
                params=params,
            )
        )
    return normalized


def _mutation_type(item: dict[str, Any]) -> str | None:
    mutation_type = item.get("type")
    if isinstance(mutation_type, str) and mutation_type:
        return mutation_type
    fallback_id = item.get("id")
    if isinstance(fallback_id, str) and fallback_id:
        # Support configs where `id` carries mutation type.
        return fallback_id
    return None


def _mutation_probability(item: dict[str, Any], *, params: dict[str, Any]) -> float:
    probability_sources = (
        item.get("probability"),
        item.get("prob"),
        params.get("probability"),
        params.get("prob"),
    )
    for value in probability_sources:
        if isinstance(value, bool):
            continue
        if isinstance(value, int | float):
            return _clamp_probability(value, default=1.0)
    return 1.0


def _extract_params(item: dict[str, Any]) -> dict[str, Any]:
    params = item.get("params")
    params_obj = dict(params) if isinstance(params, dict) else {}
    for key in (
        "from",
        "to",
        "field",
        "payload",
        "error_message",
        "prob",
        "probability",
        "timeout_ms",
    ):
        if key in item and key not in params_obj:
            params_obj[key] = item[key]
    return params_obj


def _target_tool_pattern(item: dict[str, Any]) -> str:
    target = item.get("target")
    if isinstance(target, str) and target:
        return target
    if isinstance(target, dict):
        tool_pattern = target.get("tool")
        if isinstance(tool_pattern, str) and tool_pattern:
            return tool_pattern
    tool_pattern = item.get("tool")
    if isinstance(tool_pattern, str) and tool_pattern:
        return tool_pattern
    return "*"


def _max_mutations_per_attempt(mutation_pack_config: Any) -> int:
    config_obj = mutation_pack_config if isinstance(mutation_pack_config, dict) else {}
    raw = config_obj.get("max_mutations_per_attempt")
    if isinstance(raw, int):
        return max(0, min(raw, 20))
    if isinstance(raw, float):
        return max(0, min(int(raw), 20))
    return 1


def _select_mutations(
    definitions: list[_MutationDefinition],
    *,
    rng: random.Random,
    max_mutations: int,
) -> list[_MutationDefinition]:
    if max_mutations <= 0 or not definitions:
        return []

    candidates = [item for item in definitions if rng.random() <= item.probability]
    if not candidates:
        return []
    if len(candidates) <= max_mutations:
        return candidates

    selected: list[_MutationDefinition] = []
    pool = list(candidates)
    while pool and len(selected) < max_mutations:
        weighted_pool = [(idx, item) for idx, item in enumerate(pool) if item.weight > 0]
        if not weighted_pool:
            break
        total_weight = sum(item.weight for _, item in weighted_pool)
        threshold = rng.random() * total_weight
        accumulator = 0.0
        chosen_pool_index = weighted_pool[-1][0]
        for pool_index, item in weighted_pool:
            accumulator += item.weight
            if threshold <= accumulator:
                chosen_pool_index = pool_index
                break
        selected.append(pool.pop(chosen_pool_index))

    return selected


def _apply_single_mutation(
    definition: _MutationDefinition, events: list[dict[str, Any]]
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    mutation_type = definition.mutation_type
    if mutation_type == "schema.rename_field":
        return _apply_rename_field(definition, events), None
    if mutation_type == "schema.drop_field":
        return _apply_drop_field(definition, events), None
    if mutation_type == "poison.inject":
        return _apply_poison_inject(definition, events), None
    if mutation_type == "latency_delay":
        return _apply_latency_delay(definition, events), None
    if mutation_type == "fault.timeout":
        return _apply_fault(
            definition,
            events,
            failure_reason="timeout",
            error_type="TimeoutError",
            default_error_message="simulated timeout from mutation pack",
        )
    if mutation_type == "fault.rate_limit":
        return _apply_fault(
            definition,
            events,
            failure_reason="rate_limited",
            error_type="RateLimitError",
            default_error_message="simulated rate limit from mutation pack",
        )
    if mutation_type == "fault.auth_failure":
        return _apply_fault(
            definition,
            events,
            failure_reason="auth_failed",
            error_type="AuthError",
            default_error_message="simulated auth failure from mutation pack",
        )
    return None, None


def _apply_rename_field(
    definition: _MutationDefinition, events: list[dict[str, Any]]
) -> dict[str, Any] | None:
    from_key = definition.params.get("from")
    to_key = definition.params.get("to")
    if not isinstance(from_key, str) or not from_key:
        return None
    if not isinstance(to_key, str) or not to_key:
        return None

    for event in _iter_matching_events(
        events, event_type="tool_result", tool_pattern=definition.target_tool_pattern
    ):
        result = event.get("result")
        if not isinstance(result, dict):
            continue
        if from_key not in result:
            continue
        result[to_key] = result.pop(from_key)
        return {
            "mutation_id": definition.mutation_id,
            "tool": _event_tool(event),
            "event_index": _event_index(event),
            "details": {"type": definition.mutation_type, "from": from_key, "to": to_key},
        }
    return None


def _apply_drop_field(
    definition: _MutationDefinition, events: list[dict[str, Any]]
) -> dict[str, Any] | None:
    field_name = definition.params.get("field")
    if not isinstance(field_name, str) or not field_name:
        return None

    for event in _iter_matching_events(
        events, event_type="tool_result", tool_pattern=definition.target_tool_pattern
    ):
        result = event.get("result")
        if not isinstance(result, dict):
            continue
        if field_name not in result:
            continue
        result.pop(field_name, None)
        return {
            "mutation_id": definition.mutation_id,
            "tool": _event_tool(event),
            "event_index": _event_index(event),
            "details": {"type": definition.mutation_type, "field": field_name},
        }
    return None


def _apply_poison_inject(
    definition: _MutationDefinition, events: list[dict[str, Any]]
) -> dict[str, Any] | None:
    payload = definition.params.get("payload")
    if not isinstance(payload, str) or payload == "":
        payload = "[poisoned]"
    explicit_field = definition.params.get("field")
    if not isinstance(explicit_field, str):
        explicit_field = None

    for event in _iter_matching_events(
        events, event_type="tool_result", tool_pattern=definition.target_tool_pattern
    ):
        result = event.get("result")
        if not isinstance(result, dict):
            continue
        target_field = _resolve_text_field(result, explicit_field)
        current_value = result.get(target_field)
        if isinstance(current_value, str):
            result[target_field] = f"{current_value}{payload}"
        else:
            result[target_field] = payload
        return {
            "mutation_id": definition.mutation_id,
            "tool": _event_tool(event),
            "event_index": _event_index(event),
            "details": {
                "type": definition.mutation_type,
                "field": target_field,
                "payload": payload,
            },
        }
    return None


def _apply_latency_delay(
    definition: _MutationDefinition, events: list[dict[str, Any]]
) -> dict[str, Any] | None:
    min_ms = definition.params.get("min_ms")
    max_ms = definition.params.get("max_ms")

    min_ms_value = (
        int(min_ms) if isinstance(min_ms, int | float) and not isinstance(min_ms, bool) else 0
    )
    max_ms_value = (
        int(max_ms)
        if isinstance(max_ms, int | float) and not isinstance(max_ms, bool)
        else max(min_ms_value, 1000)
    )
    if max_ms_value < min_ms_value:
        max_ms_value = min_ms_value

    injected_delay_ms = random.randint(min_ms_value, max_ms_value)

    for event in _iter_matching_events(
        events, event_type="tool_result", tool_pattern=definition.target_tool_pattern
    ):
        result = event.get("result")
        if not isinstance(result, dict):
            continue
        result["latency_ms"] = injected_delay_ms
        event["latency_ms"] = injected_delay_ms
        return {
            "mutation_id": definition.mutation_id,
            "tool": _event_tool(event),
            "event_index": _event_index(event),
            "details": {
                "type": definition.mutation_type,
                "latency_ms": injected_delay_ms,
                "range": [min_ms_value, max_ms_value],
            },
        }
    return None


def _apply_fault(
    definition: _MutationDefinition,
    events: list[dict[str, Any]],
    *,
    failure_reason: str,
    error_type: str,
    default_error_message: str,
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    error_message = definition.params.get("error_message")
    if not isinstance(error_message, str) or not error_message:
        error_message = default_error_message
    timeout_ms = definition.params.get("timeout_ms")
    timeout_ms_value: int | None = None
    if isinstance(timeout_ms, int | float) and not isinstance(timeout_ms, bool):
        timeout_ms_value = max(0, int(timeout_ms))

    for index, event in enumerate(events):
        if event.get("type") != "tool_call":
            continue
        tool = _event_tool(event)
        if not _is_mutation_target(tool):
            continue
        if not _tool_matches(definition.target_tool_pattern, tool):
            continue

        event_index = _event_index(event)
        if event_index is None:
            event_index = index
        error_index = event_index + 1
        error_event = {
            "index": error_index,
            "type": "error",
            "tool": tool,
            "error": {"type": error_type, "message": error_message},
        }
        events[:] = events[: index + 1] + [error_event]
        return (
            {
                "mutation_id": definition.mutation_id,
                "tool": tool,
                "event_index": event_index,
                "details": {
                    "type": definition.mutation_type,
                    "failure_reason": failure_reason,
                    "error_type": error_type,
                    **({"timeout_ms": timeout_ms_value} if timeout_ms_value else {}),
                    **(
                        {"http_status": 429}
                        if definition.mutation_type == "fault.rate_limit"
                        else {}
                    ),
                },
            },
            {
                "failure_reason": failure_reason,
                "event_index": error_index,
                "tool": tool,
            },
        )
    return None, None


def _iter_matching_events(
    events: list[dict[str, Any]], *, event_type: str, tool_pattern: str
) -> list[dict[str, Any]]:
    matching: list[dict[str, Any]] = []
    for event in events:
        if event.get("type") != event_type:
            continue
        tool = _event_tool(event)
        if _is_mutation_target(tool) and _tool_matches(tool_pattern, tool):
            matching.append(event)
    return matching


def _tool_matches(pattern: str, tool: str) -> bool:
    if pattern == "*" or pattern == "":
        return True
    if "*" in pattern:
        return fnmatchcase(tool, pattern)
    return tool == pattern


def _is_mutation_target(tool: str) -> bool:
    return tool not in INTERNAL_BOOTSTRAP_TOOLS


def _event_tool(event: dict[str, Any]) -> str:
    tool = event.get("tool")
    if isinstance(tool, str) and tool:
        return tool
    return "unknown"


def _event_index(event: dict[str, Any]) -> int | None:
    value = event.get("index")
    if isinstance(value, int):
        return value
    return None


def _resolve_text_field(result: dict[str, Any], explicit_field: str | None) -> str:
    if explicit_field:
        return explicit_field
    for field_name in ("text", "content", "message"):
        value = result.get(field_name)
        if isinstance(value, str):
            return field_name
    for field_name, value in result.items():
        if isinstance(field_name, str) and isinstance(value, str):
            return field_name
    return "text"


def _clamp_probability(value: Any, *, default: float) -> float:
    if isinstance(value, bool):
        return float(default)
    if isinstance(value, int | float):
        return max(0.0, min(1.0, float(value)))
    return default


def _coerce_weight(value: Any, *, default: float) -> float:
    if isinstance(value, bool):
        return float(default)
    if isinstance(value, int | float):
        return max(0.0, float(value))
    return default
