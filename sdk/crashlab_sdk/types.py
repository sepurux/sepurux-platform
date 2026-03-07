from __future__ import annotations

from typing import Any, TypedDict


class TaskPayload(TypedDict):
    name: str
    input: dict[str, Any]


TraceEvent = dict[str, Any]


class TracePayload(TypedDict):
    trace_version: str
    source: str
    task: TaskPayload
    events: list[TraceEvent]


class RunStatus(TypedDict, total=False):
    run_id: str
    status: str
    summary: dict[str, Any] | None
