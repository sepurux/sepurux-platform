from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

SUPPORTED_TRACE_VERSIONS = {"0.1", "0.2"}
SUPPORTED_EVENT_TYPES = {
    "prompt",
    "llm_call",
    "tool_call",
    "tool_result",
    "model",
    "mutation",
    "agent_output",
    "retry",
    "error",
    "failure",
}


def validate_and_normalize_trace(
    payload: Any,
) -> tuple[dict[str, Any] | None, list[dict[str, str]]]:
    issues: list[dict[str, str]] = []

    if not isinstance(payload, dict):
        issues.append({"path": "$", "message": "must be an object"})
        return None, issues

    trace_version = payload.get("trace_version")
    source = payload.get("source")
    task = payload.get("task")
    events = payload.get("events")

    if not isinstance(trace_version, str) or not trace_version:
        issues.append({"path": "trace_version", "message": "missing"})
    elif trace_version not in SUPPORTED_TRACE_VERSIONS:
        issues.append(
            {
                "path": "trace_version",
                "message": f"unsupported version '{trace_version}'",
            }
        )

    if not isinstance(source, str) or not source.strip():
        issues.append({"path": "source", "message": "missing"})

    if not isinstance(task, dict):
        issues.append({"path": "task", "message": "missing"})
    else:
        task_name = task.get("name")
        if not isinstance(task_name, str) or not task_name.strip():
            issues.append({"path": "task.name", "message": "missing"})

    if not isinstance(events, list):
        issues.append({"path": "events", "message": "missing"})

    normalized_events: list[dict[str, Any]] = []
    base_timestamp = datetime.now(UTC)
    if isinstance(events, list):
        for index, raw_event in enumerate(events):
            event_path = f"events[{index}]"
            if not isinstance(raw_event, dict):
                issues.append({"path": event_path, "message": "must be an object"})
                continue

            normalized_event = dict(raw_event)
            event_type = _normalized_event_type(normalized_event)
            if event_type not in SUPPORTED_EVENT_TYPES:
                issues.append(
                    {
                        "path": f"{event_path}.type",
                        "message": (
                            "must be one of prompt, llm_call, tool_call, tool_result, model, "
                            "mutation, agent_output, retry, error, failure"
                        ),
                    }
                )
                continue

            normalized_event["type"] = event_type
            normalized_event.pop("t", None)

            if not _is_int_not_bool(normalized_event.get("index")):
                normalized_event["index"] = index

            timestamp = normalized_event.get("timestamp")
            if not isinstance(timestamp, str) or not timestamp.strip():
                normalized_event["timestamp"] = (
                    (base_timestamp + timedelta(milliseconds=index))
                    .isoformat()
                    .replace("+00:00", "Z")
                )

            if event_type == "tool_call":
                tool = normalized_event.get("tool")
                if not isinstance(tool, str) or not tool.strip():
                    fallback_tool = normalized_event.get("name")
                    if isinstance(fallback_tool, str) and fallback_tool.strip():
                        tool = fallback_tool
                if not isinstance(tool, str) or not tool.strip():
                    issues.append({"path": f"{event_path}.tool", "message": "missing"})

                args = normalized_event.get("args")
                if not isinstance(args, dict):
                    fallback_args = normalized_event.get("input")
                    if isinstance(fallback_args, dict):
                        args = fallback_args
                if not isinstance(args, dict):
                    issues.append({"path": f"{event_path}.args", "message": "missing"})

                if isinstance(tool, str):
                    normalized_event["tool"] = tool
                if isinstance(args, dict):
                    normalized_event["args"] = args

            elif event_type == "tool_result":
                tool = normalized_event.get("tool")
                if not isinstance(tool, str) or not tool.strip():
                    fallback_tool = normalized_event.get("name")
                    if isinstance(fallback_tool, str) and fallback_tool.strip():
                        tool = fallback_tool
                if not isinstance(tool, str) or not tool.strip():
                    issues.append({"path": f"{event_path}.tool", "message": "missing"})

                has_result = "result" in normalized_event
                if not has_result and "output" in normalized_event:
                    normalized_event["result"] = normalized_event.get("output")
                    has_result = True
                if not has_result:
                    issues.append({"path": f"{event_path}.result", "message": "missing"})

                if isinstance(tool, str):
                    normalized_event["tool"] = tool
            elif event_type in {"prompt", "llm_call", "mutation", "agent_output", "retry"}:
                name = normalized_event.get("name")
                if not isinstance(name, str) or not name.strip():
                    if event_type == "prompt":
                        task_name = task.get("name") if isinstance(task, dict) else None
                        if isinstance(task_name, str) and task_name.strip():
                            normalized_event["name"] = task_name
                    elif event_type in {"llm_call", "agent_output"}:
                        normalized_event.setdefault("name", event_type.replace("_", " ").title())
                    elif event_type == "mutation":
                        mutation_name = normalized_event.get("mutation_name")
                        if isinstance(mutation_name, str) and mutation_name.strip():
                            normalized_event["name"] = mutation_name
                    elif event_type == "retry":
                        tool_name = normalized_event.get("tool")
                        if isinstance(tool_name, str) and tool_name.strip():
                            normalized_event["name"] = tool_name
            elif event_type in {"error", "failure"}:
                if "error" not in normalized_event and "message" in normalized_event:
                    normalized_event["error"] = {
                        "message": normalized_event.get("message"),
                    }

            normalized_events.append(normalized_event)

    if issues:
        return None, issues

    task_obj = dict(task) if isinstance(task, dict) else {}
    task_input = task_obj.get("input")
    if not isinstance(task_input, dict):
        task_input = {}
    task_obj["input"] = task_input

    normalized_trace = dict(payload)
    normalized_trace["trace_version"] = str(trace_version)
    normalized_trace["source"] = str(source).strip()
    normalized_trace["task"] = task_obj
    normalized_trace["events"] = normalized_events

    return normalized_trace, []


def normalized_trace_summary(normalized_payload: Any) -> dict[str, Any] | None:
    if not isinstance(normalized_payload, dict):
        return None

    events_obj = normalized_payload.get("events")
    if not isinstance(events_obj, list):
        events_obj = []

    event_types: dict[str, int] = {}
    tool_calls = 0
    tool_results = 0
    model_events = 0
    error_events = 0
    prompt_events = 0
    llm_events = 0
    mutation_events = 0
    retry_events = 0
    agent_output_events = 0
    first_event_type: str | None = None
    last_event_type: str | None = None

    for event in events_obj:
        if not isinstance(event, dict):
            continue
        event_type = event.get("type")
        if not isinstance(event_type, str):
            continue

        event_types[event_type] = event_types.get(event_type, 0) + 1
        if first_event_type is None:
            first_event_type = event_type
        last_event_type = event_type

        if event_type == "tool_call":
            tool_calls += 1
        elif event_type == "tool_result":
            tool_results += 1
        elif event_type == "model":
            model_events += 1
            llm_events += 1
        elif event_type == "llm_call":
            llm_events += 1
        elif event_type == "prompt":
            prompt_events += 1
        elif event_type == "mutation":
            mutation_events += 1
        elif event_type == "retry":
            retry_events += 1
        elif event_type == "agent_output":
            agent_output_events += 1
        elif event_type == "error":
            error_events += 1
        elif event_type == "failure":
            error_events += 1

    return {
        "trace_version": normalized_payload.get("trace_version"),
        "event_count": len(events_obj),
        "event_types": event_types,
        "tool_calls": tool_calls,
        "tool_results": tool_results,
        "model_events": model_events,
        "prompt_events": prompt_events,
        "llm_events": llm_events,
        "mutation_events": mutation_events,
        "retry_events": retry_events,
        "agent_output_events": agent_output_events,
        "error_events": error_events,
        "first_event_type": first_event_type,
        "last_event_type": last_event_type,
    }


def _normalized_event_type(event: dict[str, Any]) -> str | None:
    event_type = event.get("type")
    if isinstance(event_type, str) and event_type:
        return event_type
    legacy_type = event.get("t")
    if isinstance(legacy_type, str) and legacy_type:
        return legacy_type
    return None


def _is_int_not_bool(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)
