from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from models import TraceStep
from mutation_engine import INTERNAL_BOOTSTRAP_TOOLS

_SUCCESS = "success"
_ERROR = "error"
_TIMEOUT = "timeout"
_RETRY = "retry"


def persist_attempt_trace_steps(
    db: Session,
    *,
    project_id: UUID,
    trace_id: UUID,
    run_id: UUID,
    attempt_id: UUID,
    timeline_artifact: dict[str, Any],
    mutation_trace: dict[str, Any] | None,
) -> list[TraceStep]:
    steps = build_attempt_trace_steps(
        project_id=project_id,
        trace_id=trace_id,
        run_id=run_id,
        attempt_id=attempt_id,
        timeline_artifact=timeline_artifact,
        mutation_trace=mutation_trace,
    )
    db.add_all(steps)
    return steps


def build_attempt_trace_steps(
    *,
    project_id: UUID,
    trace_id: UUID,
    run_id: UUID,
    attempt_id: UUID,
    timeline_artifact: dict[str, Any],
    mutation_trace: dict[str, Any] | None,
) -> list[TraceStep]:
    base_time = datetime.now(UTC)
    raw_events = timeline_artifact.get("events")
    events = (
        [item for item in raw_events if isinstance(item, dict)]
        if isinstance(raw_events, list)
        else []
    )
    metadata_base = {
        "source": "run_attempt",
        "run_id": str(run_id),
        "attempt_id": str(attempt_id),
    }

    steps: list[TraceStep] = []
    steps.extend(
        _mutation_steps(
            project_id=project_id,
            trace_id=trace_id,
            run_id=run_id,
            attempt_id=attempt_id,
            base_time=base_time,
            mutation_trace=mutation_trace,
        )
    )

    pending_tool_calls: list[dict[str, Any]] = []
    for raw_event in events:
        event_type = str(raw_event.get("type") or "")

        if event_type == "tool_call":
            tool_name = _tool_name(raw_event)
            if tool_name in INTERNAL_BOOTSTRAP_TOOLS:
                continue
            pending_tool_calls.append(raw_event)
            continue

        if event_type == "tool_result":
            tool_name = _tool_name(raw_event)
            if tool_name in INTERNAL_BOOTSTRAP_TOOLS:
                continue
            matching_call = _pop_pending_tool_call(pending_tool_calls, tool_name)
            steps.extend(
                _tool_completion_steps(
                    project_id=project_id,
                    trace_id=trace_id,
                    base_time=base_time,
                    call_event=matching_call,
                    result_event=raw_event,
                    metadata_base=metadata_base,
                )
            )
            continue

        if event_type == "error":
            tool_name = _tool_name(raw_event)
            matching_call = _pop_pending_tool_call(pending_tool_calls, tool_name)
            if matching_call is not None:
                steps.extend(
                    _tool_failure_steps(
                        project_id=project_id,
                        trace_id=trace_id,
                        base_time=base_time,
                        call_event=matching_call,
                        error_event=raw_event,
                        metadata_base=metadata_base,
                    )
                )
            else:
                steps.append(
                    _event_step(
                        project_id=project_id,
                        trace_id=trace_id,
                        step_type="failure",
                        step_name=tool_name or "Failure",
                        status=_TIMEOUT if _looks_like_timeout(raw_event) else _ERROR,
                        started_at=_event_time(base_time, raw_event),
                        finished_at=_event_time(base_time, raw_event),
                        input_payload=None,
                        output_payload=raw_event.get("error"),
                        metadata=_metadata(metadata_base, raw_event),
                    )
                )
            continue

        if event_type == "model":
            started_at = _event_time(base_time, raw_event)
            steps.append(
                _event_step(
                    project_id=project_id,
                    trace_id=trace_id,
                    step_type="llm_call",
                    step_name=str(raw_event.get("name") or "LLM Call"),
                    status=_SUCCESS,
                    started_at=started_at,
                    finished_at=started_at,
                    input_payload=raw_event.get("input"),
                    output_payload=raw_event.get("output") or raw_event.get("result"),
                    metadata=_metadata(metadata_base, raw_event),
                )
            )

    for pending_call in pending_tool_calls:
        steps.append(
            _event_step(
                project_id=project_id,
                trace_id=trace_id,
                step_type="tool_call",
                step_name=_tool_name(pending_call) or "Tool Call",
                status=_SUCCESS,
                started_at=_event_time(base_time, pending_call),
                finished_at=_event_time(base_time, pending_call),
                input_payload=pending_call.get("args"),
                output_payload=None,
                metadata=_metadata(metadata_base, pending_call),
            )
        )

    return sorted(
        steps,
        key=lambda item: (
            item.started_at,
            item.finished_at or item.started_at,
            str(item.trace_step_id),
        ),
    )


def _mutation_steps(
    *,
    project_id: UUID,
    trace_id: UUID,
    run_id: UUID,
    attempt_id: UUID,
    base_time: datetime,
    mutation_trace: dict[str, Any] | None,
) -> list[TraceStep]:
    if not isinstance(mutation_trace, dict):
        return []
    applied = mutation_trace.get("applied")
    if not isinstance(applied, list):
        return []

    steps: list[TraceStep] = []
    for raw in applied:
        if not isinstance(raw, dict):
            continue
        mutation_id = raw.get("mutation_id")
        if not isinstance(mutation_id, str) or not mutation_id:
            continue
        event_index = raw.get("event_index")
        if not isinstance(event_index, int):
            event_index = 0
        started_at = base_time + timedelta(milliseconds=event_index) - timedelta(microseconds=250)
        steps.append(
            _event_step(
                project_id=project_id,
                trace_id=trace_id,
                step_type="mutation",
                step_name=mutation_id,
                mutation_name=mutation_id,
                status=_SUCCESS,
                started_at=started_at,
                finished_at=started_at,
                input_payload=raw.get("details"),
                output_payload={
                    "tool": raw.get("tool"),
                    "event_index": event_index,
                },
                metadata={
                    "source": "run_attempt",
                    "run_id": str(run_id),
                    "attempt_id": str(attempt_id),
                    "event_index": event_index,
                },
            )
        )
    return steps


def _tool_completion_steps(
    *,
    project_id: UUID,
    trace_id: UUID,
    base_time: datetime,
    call_event: dict[str, Any] | None,
    result_event: dict[str, Any],
    metadata_base: dict[str, Any],
) -> list[TraceStep]:
    started_at = _event_time(base_time, call_event or result_event)
    finished_at = _event_time(base_time, result_event)
    tool_name = _tool_name(result_event) or _tool_name(call_event) or "Tool Call"
    result_payload = (
        result_event.get("result")
        if isinstance(result_event.get("result"), dict)
        else result_event.get("result")
    )
    retries = _retry_count(result_event)

    steps: list[TraceStep] = []
    if retries > 0:
        retry_at = started_at + timedelta(microseconds=100)
        steps.append(
            _event_step(
                project_id=project_id,
                trace_id=trace_id,
                step_type="retry",
                step_name=tool_name,
                status=_RETRY,
                started_at=retry_at,
                finished_at=retry_at,
                input_payload={"retries": retries},
                output_payload=None,
                metadata=_metadata(metadata_base, result_event),
            )
        )

    steps.append(
        _event_step(
            project_id=project_id,
            trace_id=trace_id,
            step_type="tool_call",
            step_name=tool_name,
            status=_SUCCESS,
            started_at=started_at,
            finished_at=finished_at,
            latency_ms=max(int((finished_at - started_at).total_seconds() * 1000), 0),
            input_payload=(call_event or {}).get("args") if isinstance(call_event, dict) else None,
            output_payload=result_payload,
            metadata=_metadata(metadata_base, result_event),
        )
    )
    return steps


def _tool_failure_steps(
    *,
    project_id: UUID,
    trace_id: UUID,
    base_time: datetime,
    call_event: dict[str, Any],
    error_event: dict[str, Any],
    metadata_base: dict[str, Any],
) -> list[TraceStep]:
    started_at = _event_time(base_time, call_event)
    finished_at = _event_time(base_time, error_event)
    tool_name = _tool_name(error_event) or _tool_name(call_event) or "Tool Call"
    status = _TIMEOUT if _looks_like_timeout(error_event) else _ERROR
    error_payload = error_event.get("error")
    metadata = _metadata(metadata_base, error_event)
    return [
        _event_step(
            project_id=project_id,
            trace_id=trace_id,
            step_type="tool_call",
            step_name=tool_name,
            status=status,
            started_at=started_at,
            finished_at=finished_at,
            latency_ms=max(int((finished_at - started_at).total_seconds() * 1000), 0),
            input_payload=call_event.get("args"),
            output_payload=error_payload,
            metadata=metadata,
        ),
        _event_step(
            project_id=project_id,
            trace_id=trace_id,
            step_type="failure",
            step_name=tool_name,
            status=status,
            started_at=finished_at,
            finished_at=finished_at,
            input_payload=None,
            output_payload=error_payload,
            metadata=metadata,
        ),
    ]


def _event_step(
    *,
    project_id: UUID,
    trace_id: UUID,
    step_type: str,
    step_name: str,
    status: str,
    started_at: datetime,
    finished_at: datetime | None,
    mutation_name: str | None = None,
    input_payload: Any | None = None,
    output_payload: Any | None = None,
    latency_ms: int | None = None,
    metadata: dict[str, Any] | None = None,
) -> TraceStep:
    return TraceStep(
        trace_step_id=uuid4(),
        trace_id=trace_id,
        project_id=project_id,
        step_type=step_type,
        step_name=step_name,
        mutation_name=mutation_name,
        status=status,
        input_payload=input_payload,
        output_payload=output_payload,
        latency_ms=latency_ms,
        started_at=started_at,
        finished_at=finished_at,
        step_metadata=metadata,
    )


def _event_time(base_time: datetime, raw_event: dict[str, Any]) -> datetime:
    index = raw_event.get("index")
    if isinstance(index, int):
        return base_time + timedelta(milliseconds=index)
    return base_time


def _metadata(base: dict[str, Any], raw_event: dict[str, Any]) -> dict[str, Any]:
    metadata = dict(base)
    metadata["event_index"] = raw_event.get("index")
    metadata["raw_event_type"] = raw_event.get("type")
    return metadata


def _tool_name(raw_event: dict[str, Any] | None) -> str | None:
    if not isinstance(raw_event, dict):
        return None
    tool = raw_event.get("tool")
    if isinstance(tool, str) and tool:
        return tool
    name = raw_event.get("name")
    if isinstance(name, str) and name:
        return name
    return None


def _pop_pending_tool_call(
    pending_tool_calls: list[dict[str, Any]],
    tool_name: str | None,
) -> dict[str, Any] | None:
    if tool_name:
        for index in range(len(pending_tool_calls) - 1, -1, -1):
            if _tool_name(pending_tool_calls[index]) == tool_name:
                return pending_tool_calls.pop(index)
    return pending_tool_calls.pop() if pending_tool_calls else None


def _retry_count(raw_event: dict[str, Any]) -> int:
    result = raw_event.get("result")
    if not isinstance(result, dict):
        return 0
    retries = result.get("retries")
    if isinstance(retries, int) and retries > 0:
        return retries
    return 0


def _looks_like_timeout(raw_event: dict[str, Any]) -> bool:
    error = raw_event.get("error")
    if isinstance(error, dict):
        error_type = error.get("type")
        if isinstance(error_type, str) and "timeout" in error_type.lower():
            return True
        error_message = error.get("message")
        if isinstance(error_message, str) and "timeout" in error_message.lower():
            return True
    return False
