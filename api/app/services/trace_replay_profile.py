from __future__ import annotations

from typing import Any

from app.services.trace_bootstrap_service import INTERNAL_TOOLS, extract_tools_from_trace_payload

UPLOAD_REPLAY_PROFILE_VERSION = 1
_PRIMARY_ACTION_HINTS = (
    "refund",
    "revoke",
    "charge",
    "purchase",
    "deploy",
    "delete",
    "remove",
    "update",
    "create",
    "write",
    "commit",
)
_SECONDARY_ACTION_HINTS = (
    "send",
    "post",
    "invite",
    "notify",
)


def enrich_normalized_trace_for_replay(
    normalized_payload: dict[str, Any] | None,
) -> dict[str, Any] | None:
    if not isinstance(normalized_payload, dict):
        return normalized_payload

    enriched = dict(normalized_payload)
    sepurux = enriched.get("sepurux")
    sepurux_obj = dict(sepurux) if isinstance(sepurux, dict) else {}
    sepurux_obj["replay_profile"] = build_trace_replay_profile(enriched)
    enriched["sepurux"] = sepurux_obj
    return enriched


def build_trace_replay_profile(normalized_payload: dict[str, Any]) -> dict[str, Any]:
    baseline_candidates = derive_trace_baseline_candidates(normalized_payload)
    profile: dict[str, Any] = {
        "version": UPLOAD_REPLAY_PROFILE_VERSION,
        "tool_inventory": extract_tools_from_trace_payload(normalized_payload),
        "baseline_candidates": baseline_candidates,
    }

    primary_mutation = choose_primary_baseline_candidate(baseline_candidates)
    if primary_mutation is not None:
        profile["primary_mutation"] = primary_mutation

    trace_hardening = infer_trace_hardening_from_payload(normalized_payload)
    if trace_hardening is not None:
        profile["trace_hardening"] = trace_hardening

    return profile


def get_trace_replay_profile(normalized_payload: Any) -> dict[str, Any] | None:
    if not isinstance(normalized_payload, dict):
        return None
    sepurux = normalized_payload.get("sepurux")
    if not isinstance(sepurux, dict):
        return None
    replay_profile = sepurux.get("replay_profile")
    return replay_profile if isinstance(replay_profile, dict) else None


def get_uploaded_trace_primary_mutation(normalized_payload: Any) -> dict[str, Any] | None:
    replay_profile = get_trace_replay_profile(normalized_payload)
    if replay_profile is None:
        return None
    primary_mutation = replay_profile.get("primary_mutation")
    return dict(primary_mutation) if isinstance(primary_mutation, dict) else None


def resolve_uploaded_trace_baseline_candidates(
    normalized_payload: Any,
    *,
    required_tools: list[str] | None = None,
    primary_only: bool = False,
) -> list[dict[str, Any]]:
    replay_profile = get_trace_replay_profile(normalized_payload)
    if replay_profile is None:
        return []

    baseline_candidates_obj = replay_profile.get("baseline_candidates")
    baseline_candidates = [
        dict(item)
        for item in baseline_candidates_obj
        if isinstance(item, dict)
    ] if isinstance(baseline_candidates_obj, list) else []

    if required_tools:
        required_tool_set = {tool for tool in required_tools if isinstance(tool, str) and tool.strip()}
        filtered = [
            candidate
            for candidate in baseline_candidates
            if isinstance(candidate.get("tool"), str) and candidate["tool"] in required_tool_set
        ]
        if filtered:
            return filtered

    if primary_only:
        primary_mutation = replay_profile.get("primary_mutation")
        if isinstance(primary_mutation, dict):
            return [dict(primary_mutation)]
        if baseline_candidates:
            return [baseline_candidates[0]]
        return []

    return baseline_candidates


def get_uploaded_trace_hardening(normalized_payload: Any) -> dict[str, Any] | None:
    replay_profile = get_trace_replay_profile(normalized_payload)
    if replay_profile is None:
        return None
    trace_hardening = replay_profile.get("trace_hardening")
    return dict(trace_hardening) if isinstance(trace_hardening, dict) else None


def derive_trace_baseline_candidates(normalized_payload: dict[str, Any]) -> list[dict[str, Any]]:
    events = normalized_payload.get("events")
    if not isinstance(events, list):
        return []

    candidates: list[dict[str, Any]] = []
    seen_tools: set[str] = set()
    for event in events:
        if not isinstance(event, dict):
            continue
        if event.get("type") != "tool_call":
            continue
        tool = event.get("tool")
        if not isinstance(tool, str):
            continue
        normalized_tool = tool.strip()
        if not normalized_tool or normalized_tool in INTERNAL_TOOLS or normalized_tool in seen_tools:
            continue
        args = event.get("args")
        if not isinstance(args, dict):
            continue

        mutation_args = dict(args)
        if tool_likely_requires_confirmation(normalized_tool):
            mutation_args.setdefault("confirmation_token", "approved")

        candidates.append(
            {
                "mutation_id": f"baseline.{normalized_tool}",
                "tool": normalized_tool,
                "args": mutation_args,
            }
        )
        seen_tools.add(normalized_tool)

    return candidates


def choose_primary_baseline_candidate(
    candidates: list[dict[str, Any]],
) -> dict[str, Any] | None:
    if not candidates:
        return None

    def _priority(item: tuple[int, dict[str, Any]]) -> tuple[int, int]:
        index, candidate = item
        tool = candidate.get("tool")
        if not isinstance(tool, str):
            return (3, index)
        normalized_tool = tool.strip().lower()
        if any(hint in normalized_tool for hint in _PRIMARY_ACTION_HINTS):
            return (0, index)
        if any(hint in normalized_tool for hint in _SECONDARY_ACTION_HINTS):
            return (1, index)
        return (2, index)

    _, chosen = min(enumerate(candidates), key=_priority)
    return dict(chosen)


def infer_trace_hardening_from_payload(
    normalized_payload: dict[str, Any],
) -> dict[str, Any] | None:
    raw_events = normalized_payload.get("events")
    events = [item for item in raw_events if isinstance(item, dict)] if isinstance(raw_events, list) else []

    hardening: dict[str, Any] = {}

    retry_policy = _infer_trace_retry_policy(events)
    if retry_policy is not None:
        hardening["retry_policy"] = retry_policy

    schema_adapter = _infer_trace_schema_adapter(events)
    if schema_adapter is not None:
        hardening["schema_adapter"] = schema_adapter

    if not hardening:
        return None
    hardening["source"] = "trace_inference_v1"
    return hardening


def tool_likely_requires_confirmation(tool_name: str) -> bool:
    lowered = tool_name.lower()
    return any(hint in lowered for hint in (*_PRIMARY_ACTION_HINTS, *_SECONDARY_ACTION_HINTS))


def _infer_trace_retry_policy(events: list[dict[str, Any]]) -> dict[str, int] | None:
    max_retries = 0
    max_backoff_ms = 0
    saw_retry_signal = False

    for event in events:
        event_type = str(event.get("type") or "").strip().lower()
        if event_type == "retry":
            result = event.get("result")
            result_obj = result if isinstance(result, dict) else {}
            raw_attempt = result_obj.get("attempt")
            if isinstance(raw_attempt, int | float) and not isinstance(raw_attempt, bool):
                max_retries = max(max_retries, max(int(raw_attempt) - 1, 0))
                saw_retry_signal = True
            raw_backoff = result_obj.get("backoff_ms")
            if isinstance(raw_backoff, int | float) and not isinstance(raw_backoff, bool):
                max_backoff_ms = max(max_backoff_ms, max(int(raw_backoff), 0))
                saw_retry_signal = True
            continue

        if event_type != "tool_call":
            continue
        args = event.get("args")
        args_obj = args if isinstance(args, dict) else {}
        retry_count = args_obj.get("retry_count")
        if isinstance(retry_count, int | float) and not isinstance(retry_count, bool):
            max_retries = max(max_retries, max(int(retry_count), 0))
            saw_retry_signal = True

    if not saw_retry_signal or max_retries <= 0:
        return None
    if max_backoff_ms <= 0:
        max_backoff_ms = 300
    return {
        "max_retries": max_retries,
        "backoff_ms": max_backoff_ms,
    }


def _infer_trace_schema_adapter(events: list[dict[str, Any]]) -> dict[str, dict[str, str]] | None:
    mappings: dict[str, str] = {}
    saw_state_only_result = False
    saw_status_normalization = False

    for event in events:
        event_type = str(event.get("type") or "").strip().lower()
        if event_type == "tool_result":
            result = event.get("result")
            result_obj = result if isinstance(result, dict) else {}
            if "state" in result_obj and "status" not in result_obj:
                saw_state_only_result = True
            continue

        if event_type != "agent_output":
            continue
        result = event.get("result")
        result_obj = result if isinstance(result, dict) else {}
        if isinstance(result_obj.get("normalized_status"), str) or isinstance(
            result_obj.get("canonical_status"), str
        ):
            saw_status_normalization = True
        source_field = result_obj.get("source_field")
        if isinstance(source_field, str) and source_field:
            if isinstance(result_obj.get("normalized_status"), str) or isinstance(
                result_obj.get("canonical_status"), str
            ):
                mappings["status"] = source_field
                continue
        adapter_name = result_obj.get("adapter")
        if isinstance(adapter_name, str) and "state_to_status" in adapter_name.lower():
            mappings.setdefault("status", "state")

    if not mappings and saw_state_only_result and saw_status_normalization:
        mappings["status"] = "state"
    if not mappings:
        return None
    return {"mappings": mappings}
