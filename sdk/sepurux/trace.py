from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from .types import TraceEvent, TracePayload


class TraceBuilder:
    """Builds Sepurux trace payloads in the backend-compatible schema."""

    def __init__(
        self,
        task_name: str,
        task_input: dict[str, Any] | None = None,
        *,
        source: str = "sdk",
        trace_version: str = "0.1",
    ) -> None:
        if not task_name.strip():
            raise ValueError("task_name must be a non-empty string")
        if not source.strip():
            raise ValueError("source must be a non-empty string")
        if not trace_version.strip():
            raise ValueError("trace_version must be a non-empty string")

        self._trace_version = trace_version
        self._source = source
        self._task_name = task_name
        self._task_input = task_input or {}
        self._events: list[TraceEvent] = []

    def add_model_step(
        self,
        name: str,
        input: Any,
        output: Any | None = None,
    ) -> TraceBuilder:
        event: TraceEvent = {
            "type": "model_step",
            "timestamp": _utc_now_iso(),
            "name": name,
            "input": input,
        }
        if output is not None:
            event["output"] = output
        self._events.append(event)
        return self

    def add_tool_call(self, tool: str, args: dict[str, Any]) -> TraceBuilder:
        event: TraceEvent = {
            "type": "tool_call",
            "timestamp": _utc_now_iso(),
            "tool": tool,
            "args": args,
        }
        self._events.append(event)
        return self

    def add_tool_result(self, tool: str, result: Any) -> TraceBuilder:
        event: TraceEvent = {
            "type": "tool_result",
            "timestamp": _utc_now_iso(),
            "tool": tool,
            "result": result,
        }
        self._events.append(event)
        return self

    def add_error(self, message: str, tool: str | None = None) -> TraceBuilder:
        event: TraceEvent = {
            "type": "error",
            "timestamp": _utc_now_iso(),
            "message": message,
        }
        if tool:
            event["tool"] = tool
        self._events.append(event)
        return self

    def to_trace(self) -> TracePayload:
        return {
            "trace_version": self._trace_version,
            "source": self._source,
            "task": {
                "name": self._task_name,
                "input": self._task_input,
            },
            "events": list(self._events),
        }


def _utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()
