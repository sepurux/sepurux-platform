from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID


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
) -> AttemptReplayOutcome:
    mutation_obj = mutation if isinstance(mutation, dict) else {"value": mutation}
    tool_name = str(mutation_obj.get("tool") or "replay.execute")
    mutation_id = str(mutation_obj.get("mutation_id") or mutation_obj.get("id") or default_mutation_id)
    compact_args = _compact_json(mutation_obj.get("args") or mutation_obj, max_items=8, max_string=240)
    should_fail = bool(mutation_obj.get("force_fail") or mutation_obj.get("should_fail"))
    failure_reason = str(mutation_obj.get("failure_reason") or "simulated_failure") if should_fail else None

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
        events.append(
            {
                "index": 3,
                "type": "tool_result",
                "tool": tool_name,
                "result": {"ok": True, "status": "replayed"},
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
