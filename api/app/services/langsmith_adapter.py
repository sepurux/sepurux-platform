"""
LangSmith → Sepurux trace format adapter.

LangSmith traces are trees of "runs" where each run has a run_type, inputs, outputs,
optional error, and nested child_runs.  This module detects that shape and converts it
to the flat Sepurux event list that validate_and_normalize_trace expects.

run_type mapping
  llm / chat_model  → llm_call
  chain             → llm_call  (orchestration chains)
  prompt            → prompt
  parser            → agent_output
  tool / retriever
  / embedding       → tool_call + tool_result pair (LangSmith combines I/O in one run)
"""
from __future__ import annotations

from typing import Any

# ── run_type → Sepurux event type ─────────────────────────────────────────────
_RUN_TYPE_MAP: dict[str, str] = {
    "llm": "llm_call",
    "chat_model": "llm_call",
    "chain": "llm_call",
    "prompt": "prompt",
    "parser": "agent_output",
    "tool": "tool_call",
    "retriever": "tool_call",
    "embedding": "tool_call",
}
_TOOL_TYPES = {"tool_call"}


def is_langsmith_trace(payload: Any) -> bool:
    """
    Return True when the payload looks like a LangSmith run object.

    Heuristic: has run_type OR child_runs, and does NOT already have the
    Sepurux required fields (trace_version / events).
    """
    if not isinstance(payload, dict):
        return False
    has_run_type = isinstance(payload.get("run_type"), str)
    has_child_runs = isinstance(payload.get("child_runs"), list)
    lacks_sepurux = "trace_version" not in payload and "events" not in payload
    return (has_run_type or has_child_runs) and lacks_sepurux


# ── helpers ───────────────────────────────────────────────────────────────────

def _event_type(run_type: str) -> str:
    return _RUN_TYPE_MAP.get(run_type.lower(), "llm_call")


def _run_status(run: dict[str, Any]) -> str:
    error = run.get("error")
    if isinstance(error, str) and error.strip():
        return "error"
    outputs = run.get("outputs")
    if isinstance(outputs, dict) and outputs.get("error"):
        return "error"
    return "success"


def _sorted_children(run: dict[str, Any]) -> list[dict[str, Any]]:
    children = run.get("child_runs") or []
    if not isinstance(children, list):
        return []
    valid = [c for c in children if isinstance(c, dict)]
    return sorted(valid, key=lambda r: r.get("execution_order", 0))


def _flatten_run(
    run: dict[str, Any],
    events: list[dict[str, Any]],
    counter: list[int],
) -> None:
    """
    Recursively convert one LangSmith run (and its children) into Sepurux events.

    Tool runs emit a tool_call before their children and a tool_result after,
    mirroring the request/response pairing the engine expects.
    All other run types emit a single event then recurse into children.
    """
    run_type = str(run.get("run_type", "chain")).lower()
    name = str(run.get("name") or "unknown")
    inputs: dict[str, Any] = run.get("inputs") or {}
    outputs: dict[str, Any] = run.get("outputs") or {}
    error = run.get("error")
    start_time = run.get("start_time")
    end_time = run.get("end_time")
    status = _run_status(run)
    etype = _event_type(run_type)

    if etype in _TOOL_TYPES:
        # ── tool_call ─────────────────────────────────────────────────────────
        call_idx = counter[0]
        counter[0] += 1
        call_event: dict[str, Any] = {
            "type": "tool_call",
            "index": call_idx,
            "tool": name,
            "args": inputs if isinstance(inputs, dict) else {},
            "status": status,
        }
        if isinstance(start_time, str) and start_time.strip():
            call_event["timestamp"] = start_time
        events.append(call_event)

        # recurse children between call and result
        for child in _sorted_children(run):
            _flatten_run(child, events, counter)

        # ── tool_result ───────────────────────────────────────────────────────
        result_idx = counter[0]
        counter[0] += 1
        result_event: dict[str, Any] = {
            "type": "tool_result",
            "index": result_idx,
            "tool": name,
            "result": outputs if isinstance(outputs, dict) else {},
            "status": status,
        }
        if isinstance(end_time, str) and end_time.strip():
            result_event["timestamp"] = end_time
        events.append(result_event)

    else:
        # ── llm_call / prompt / agent_output ──────────────────────────────────
        idx = counter[0]
        counter[0] += 1
        event: dict[str, Any] = {
            "type": etype,
            "index": idx,
            "name": name,
            "status": status,
        }
        if isinstance(start_time, str) and start_time.strip():
            event["timestamp"] = start_time
        if isinstance(inputs, dict) and inputs:
            event["input"] = inputs
        if isinstance(outputs, dict) and outputs:
            event["output"] = outputs
        events.append(event)

        for child in _sorted_children(run):
            _flatten_run(child, events, counter)

    # ── error event for runs that failed ─────────────────────────────────────
    if isinstance(error, str) and error.strip():
        err_idx = counter[0]
        counter[0] += 1
        events.append(
            {
                "type": "error",
                "index": err_idx,
                "error": {"message": error},
                "status": "error",
            }
        )


# ── public API ────────────────────────────────────────────────────────────────

def adapt_langsmith_trace(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Convert a LangSmith root run to a Sepurux trace payload.

    The root run becomes the task.  Its child_runs are flattened (depth-first,
    execution_order sorted) into Sepurux events.  If the root has no child_runs
    (single-run trace), the root itself is emitted as the sole event.
    """
    root_name = str(payload.get("name") or "langsmith_trace")
    root_inputs = payload.get("inputs")
    task_input = root_inputs if isinstance(root_inputs, dict) else {}

    events: list[dict[str, Any]] = []
    counter = [0]

    children = _sorted_children(payload)
    if children:
        # Root = task; flatten children into events
        for child in children:
            _flatten_run(child, events, counter)
        # Bubble up a root-level error if no error event was already emitted
        root_error = payload.get("error")
        if isinstance(root_error, str) and root_error.strip():
            if not any(e.get("type") == "error" for e in events):
                events.append(
                    {
                        "type": "error",
                        "index": counter[0],
                        "error": {"message": root_error},
                        "status": "error",
                    }
                )
    else:
        # Single-run trace — the run itself is the only event
        _flatten_run(payload, events, counter)

    adapted: dict[str, Any] = {
        "trace_version": "0.2",
        "source": "langsmith",
        "task": {
            "name": root_name,
            "input": task_input,
        },
        "events": events,
    }

    # Preserve the original LangSmith run ID as metadata (ignored by validation)
    ls_id = payload.get("id")
    if isinstance(ls_id, str) and ls_id.strip():
        adapted["langsmith_run_id"] = ls_id

    return adapted
