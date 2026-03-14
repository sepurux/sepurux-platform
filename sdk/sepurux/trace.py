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

    def add_prompt(
        self,
        input: Any,
        *,
        name: str | None = None,
    ) -> TraceBuilder:
        return self._append_event(
            {
                "type": "prompt",
                "timestamp": _utc_now_iso(),
                "name": name or self._task_name,
                "input": input,
                "status": "success",
            }
        )

    def add_llm_call(
        self,
        name: str,
        input: Any,
        output: Any | None = None,
        *,
        latency_ms: int | None = None,
        status: str = "success",
    ) -> TraceBuilder:
        event: TraceEvent = {
            "type": "llm_call",
            "timestamp": _utc_now_iso(),
            "name": name,
            "input": input,
            "status": status,
        }
        if output is not None:
            event["output"] = output
        if latency_ms is not None:
            event["latency_ms"] = latency_ms
        return self._append_event(event)

    def add_model_step(
        self,
        name: str,
        input: Any,
        output: Any | None = None,
    ) -> TraceBuilder:
        return self._append_event(
            {
                "type": "model",
                "timestamp": _utc_now_iso(),
                "name": name,
                "input": input,
                **({"output": output} if output is not None else {}),
            }
        )

    def add_tool_call(
        self,
        tool: str,
        args: dict[str, Any],
        *,
        latency_ms: int | None = None,
        status: str | None = None,
    ) -> TraceBuilder:
        event: TraceEvent = {
            "type": "tool_call",
            "timestamp": _utc_now_iso(),
            "tool": tool,
            "args": args,
        }
        if latency_ms is not None:
            event["latency_ms"] = latency_ms
        if status is not None:
            event["status"] = status
        return self._append_event(event)

    def add_tool_result(self, tool: str, result: Any) -> TraceBuilder:
        return self._append_event(
            {
                "type": "tool_result",
                "timestamp": _utc_now_iso(),
                "tool": tool,
                "result": result,
            }
        )

    def add_mutation(
        self,
        mutation_name: str,
        *,
        input: Any | None = None,
        output: Any | None = None,
    ) -> TraceBuilder:
        event: TraceEvent = {
            "type": "mutation",
            "timestamp": _utc_now_iso(),
            "name": mutation_name,
            "mutation_name": mutation_name,
            "status": "success",
        }
        if input is not None:
            event["input"] = input
        if output is not None:
            event["output"] = output
        return self._append_event(event)

    def add_agent_output(
        self,
        output: Any,
        *,
        name: str = "Agent Output",
    ) -> TraceBuilder:
        return self._append_event(
            {
                "type": "agent_output",
                "timestamp": _utc_now_iso(),
                "name": name,
                "output": output,
                "status": "success",
            }
        )

    def add_retry(self, name: str, *, retries: int = 1) -> TraceBuilder:
        return self._append_event(
            {
                "type": "retry",
                "timestamp": _utc_now_iso(),
                "name": name,
                "input": {"retries": retries},
                "status": "retry",
            }
        )

    def add_error(self, message: str, tool: str | None = None) -> TraceBuilder:
        event: TraceEvent = {
            "type": "failure",
            "timestamp": _utc_now_iso(),
            "error": {"message": message},
            "status": "error",
        }
        if tool:
            event["tool"] = tool
        return self._append_event(event)

    def _append_event(self, event: TraceEvent) -> TraceBuilder:
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
