from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

from app.models import Trace, TraceStep
from app.services.trace_validation import validate_and_normalize_trace
from app.storage import get_json_object
from sqlalchemy import func, select
from sqlalchemy.orm import Session

_SUCCESS = "success"
_ERROR = "error"
_TIMEOUT = "timeout"
_RETRY = "retry"

_STEP_TYPE_MAP = {
    "prompt": "prompt",
    "llm_call": "llm_call",
    "model": "llm_call",
    "tool_call": "tool_call",
    "tool_result": "tool_call",
    "mutation": "mutation",
    "agent_output": "agent_output",
    "retry": "retry",
    "error": "failure",
    "failure": "failure",
}


def create_trace_steps_for_trace(
    db: Session,
    *,
    trace: Trace,
    normalized_payload: dict[str, Any] | None,
) -> list[TraceStep]:
    if not isinstance(normalized_payload, dict):
        return []

    steps = build_trace_steps_from_payload(
        project_id=trace.project_id,
        trace_id=trace.trace_id,
        payload=normalized_payload,
        source_metadata={"source": "trace_upload"},
    )
    db.add_all(steps)
    return steps


def ensure_trace_steps_for_trace(db: Session, *, trace: Trace) -> list[TraceStep]:
    existing = db.scalar(
        select(func.count()).select_from(TraceStep).where(TraceStep.trace_id == trace.trace_id)
    )
    if isinstance(existing, int) and existing > 0:
        return list_trace_steps(db, project_id=trace.project_id, trace_id=trace.trace_id)

    normalized_payload = trace.normalized_payload
    if not isinstance(normalized_payload, dict):
        raw_payload = _load_trace_payload(trace)
        normalized_payload, issues = validate_and_normalize_trace(raw_payload)
        if normalized_payload is None or issues:
            return []

    create_trace_steps_for_trace(db, trace=trace, normalized_payload=normalized_payload)
    db.commit()
    return list_trace_steps(db, project_id=trace.project_id, trace_id=trace.trace_id)


def list_trace_steps(db: Session, *, project_id: UUID, trace_id: UUID) -> list[TraceStep]:
    stmt = (
        select(TraceStep)
        .where(
            TraceStep.project_id == project_id,
            TraceStep.trace_id == trace_id,
        )
        .order_by(TraceStep.started_at.asc(), TraceStep.trace_step_id.asc())
    )
    return list(db.scalars(stmt))


def serialize_trace_step(step: TraceStep) -> dict[str, Any]:
    metadata = step.step_metadata if isinstance(step.step_metadata, dict) else None
    return {
        "id": step.trace_step_id,
        "trace_id": step.trace_id,
        "step_type": step.step_type,
        "step_name": step.step_name,
        "mutation_name": step.mutation_name,
        "status": step.status,
        "input_payload": step.input_payload,
        "output_payload": step.output_payload,
        "latency_ms": step.latency_ms,
        "started_at": step.started_at,
        "finished_at": step.finished_at,
        "metadata": metadata,
    }


def build_trace_steps_from_payload(
    *,
    project_id: UUID,
    trace_id: UUID,
    payload: dict[str, Any],
    source_metadata: dict[str, Any] | None = None,
) -> list[TraceStep]:
    events = payload.get("events")
    task = payload.get("task")
    normalized_events = (
        [item for item in events if isinstance(item, dict)] if isinstance(events, list) else []
    )
    task_obj = task if isinstance(task, dict) else {}

    steps: list[TraceStep] = []
    has_explicit_prompt = any(str(event.get("type")) == "prompt" for event in normalized_events)
    prompt_started_at = _prompt_timestamp(task_obj, normalized_events)
    if not has_explicit_prompt and isinstance(task_obj.get("name"), str):
        steps.append(
            _step(
                project_id=project_id,
                trace_id=trace_id,
                step_type="prompt",
                step_name=str(task_obj.get("name") or "Prompt"),
                status=_SUCCESS,
                input_payload=(
                    task_obj.get("input") if isinstance(task_obj.get("input"), dict) else {}
                ),
                output_payload=None,
                started_at=prompt_started_at,
                finished_at=prompt_started_at,
                metadata=_merge_metadata(
                    source_metadata,
                    {"implicit": True, "raw_event_type": "task"},
                ),
            )
        )

    pending_tool_calls: list[dict[str, Any]] = []

    for raw_event in normalized_events:
        event_type = str(raw_event.get("type") or "")

        if event_type == "tool_call":
            pending_tool_calls.append(raw_event)
            continue

        if event_type == "tool_result":
            matching_call = _pop_pending_tool_call(pending_tool_calls, raw_event.get("tool"))
            steps.extend(
                _steps_for_tool_completion(
                    project_id=project_id,
                    trace_id=trace_id,
                    call_event=matching_call,
                    completion_event=raw_event,
                    source_metadata=source_metadata,
                )
            )
            continue

        if event_type in {"error", "failure"}:
            matching_call = _pop_pending_tool_call(pending_tool_calls, raw_event.get("tool"))
            if matching_call is not None:
                steps.extend(
                    _steps_for_tool_failure(
                        project_id=project_id,
                        trace_id=trace_id,
                        call_event=matching_call,
                        error_event=raw_event,
                        source_metadata=source_metadata,
                    )
                )
            else:
                steps.append(
                    _direct_step_from_event(
                        project_id=project_id,
                        trace_id=trace_id,
                        raw_event=raw_event,
                        source_metadata=source_metadata,
                    )
                )
            continue

        steps.append(
            _direct_step_from_event(
                project_id=project_id,
                trace_id=trace_id,
                raw_event=raw_event,
                source_metadata=source_metadata,
            )
        )

    for pending_call in pending_tool_calls:
        steps.append(
            _tool_call_only_step(
                project_id=project_id,
                trace_id=trace_id,
                call_event=pending_call,
                source_metadata=source_metadata,
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


def _load_trace_payload(trace: Trace) -> Any:
    try:
        return get_json_object(trace.s3_key)
    except Exception:
        return None


def _direct_step_from_event(
    *,
    project_id: UUID,
    trace_id: UUID,
    raw_event: dict[str, Any],
    source_metadata: dict[str, Any] | None,
) -> TraceStep:
    raw_type = str(raw_event.get("type") or "")
    step_type = _STEP_TYPE_MAP.get(raw_type, "failure")
    step_name = _event_step_name(raw_event, step_type=step_type)
    started_at = _event_started_at(raw_event)
    finished_at = _event_finished_at(raw_event, started_at=started_at)
    status = _event_status(raw_event, raw_type=raw_type)

    return _step(
        project_id=project_id,
        trace_id=trace_id,
        step_type=step_type,
        step_name=step_name,
        mutation_name=_event_mutation_name(raw_event, step_type=step_type),
        status=status,
        input_payload=_event_input_payload(raw_event, step_type=step_type),
        output_payload=_event_output_payload(raw_event, step_type=step_type),
        latency_ms=_event_latency_ms(raw_event, started_at=started_at, finished_at=finished_at),
        started_at=started_at,
        finished_at=finished_at,
        metadata=_merge_metadata(
            source_metadata,
            {
                "raw_event_type": raw_type,
                "event_index": raw_event.get("index"),
            },
        ),
    )


def _steps_for_tool_completion(
    *,
    project_id: UUID,
    trace_id: UUID,
    call_event: dict[str, Any] | None,
    completion_event: dict[str, Any],
    source_metadata: dict[str, Any] | None,
) -> list[TraceStep]:
    started_at = _event_started_at(call_event or completion_event)
    finished_at = _event_finished_at(completion_event, started_at=started_at)
    tool_name = _tool_name(completion_event) or _tool_name(call_event) or "tool.call"
    retries = _retry_count(completion_event)

    steps: list[TraceStep] = []
    if retries > 0:
        retry_at = started_at + timedelta(microseconds=100)
        steps.append(
            _step(
                project_id=project_id,
                trace_id=trace_id,
                step_type="retry",
                step_name=tool_name,
                status=_RETRY,
                input_payload={"retries": retries},
                output_payload=None,
                started_at=retry_at,
                finished_at=retry_at,
                metadata=_merge_metadata(
                    source_metadata,
                    {
                        "raw_event_type": "tool_result",
                        "event_index": completion_event.get("index"),
                    },
                ),
            )
        )

    steps.append(
        _step(
            project_id=project_id,
            trace_id=trace_id,
            step_type="tool_call",
            step_name=tool_name,
            status=_SUCCESS,
            input_payload=(call_event or {}).get("args") if isinstance(call_event, dict) else None,
            output_payload=completion_event.get("result"),
            latency_ms=_event_latency_ms(
                completion_event,
                started_at=started_at,
                finished_at=finished_at,
            ),
            started_at=started_at,
            finished_at=finished_at,
            metadata=_merge_metadata(
                source_metadata,
                {
                    "raw_event_type": "tool_result",
                    "call_index": (
                        (call_event or {}).get("index") if isinstance(call_event, dict) else None
                    ),
                    "event_index": completion_event.get("index"),
                },
            ),
        )
    )
    return steps


def _steps_for_tool_failure(
    *,
    project_id: UUID,
    trace_id: UUID,
    call_event: dict[str, Any],
    error_event: dict[str, Any],
    source_metadata: dict[str, Any] | None,
) -> list[TraceStep]:
    tool_name = _tool_name(error_event) or _tool_name(call_event) or "tool.call"
    started_at = _event_started_at(call_event)
    finished_at = _event_finished_at(error_event, started_at=started_at)
    error_payload = (
        error_event.get("error")
        if isinstance(error_event.get("error"), dict)
        else {"message": error_event.get("message")}
    )
    status = _event_status(error_event, raw_type="error")
    metadata = _merge_metadata(
        source_metadata,
        {
            "raw_event_type": "error",
            "call_index": call_event.get("index"),
            "event_index": error_event.get("index"),
        },
    )
    return [
        _step(
            project_id=project_id,
            trace_id=trace_id,
            step_type="tool_call",
            step_name=tool_name,
            status=status,
            input_payload=(
                call_event.get("args") if isinstance(call_event.get("args"), dict) else None
            ),
            output_payload=error_payload,
            latency_ms=_event_latency_ms(
                error_event, started_at=started_at, finished_at=finished_at
            ),
            started_at=started_at,
            finished_at=finished_at,
            metadata=metadata,
        ),
        _step(
            project_id=project_id,
            trace_id=trace_id,
            step_type="failure",
            step_name=tool_name,
            status=status,
            input_payload=None,
            output_payload=error_payload,
            started_at=finished_at,
            finished_at=finished_at,
            metadata=metadata,
        ),
    ]


def _tool_call_only_step(
    *,
    project_id: UUID,
    trace_id: UUID,
    call_event: dict[str, Any],
    source_metadata: dict[str, Any] | None,
) -> TraceStep:
    started_at = _event_started_at(call_event)
    return _step(
        project_id=project_id,
        trace_id=trace_id,
        step_type="tool_call",
        step_name=_tool_name(call_event) or "tool.call",
        status=_SUCCESS,
        input_payload=call_event.get("args") if isinstance(call_event.get("args"), dict) else None,
        output_payload=call_event.get("result"),
        latency_ms=_event_latency_ms(call_event, started_at=started_at, finished_at=started_at),
        started_at=started_at,
        finished_at=started_at,
        metadata=_merge_metadata(
            source_metadata,
            {"raw_event_type": "tool_call", "event_index": call_event.get("index")},
        ),
    )


def _step(
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


def _prompt_timestamp(task: dict[str, Any], events: list[dict[str, Any]]) -> datetime:
    first_event = events[0] if events else {}
    if isinstance(first_event, dict):
        first_event_at = _event_started_at(first_event)
        return first_event_at - timedelta(milliseconds=1)
    return datetime.now(UTC)


def _pop_pending_tool_call(
    pending_tool_calls: list[dict[str, Any]],
    tool: object,
) -> dict[str, Any] | None:
    tool_name = tool if isinstance(tool, str) else None
    if tool_name:
        for index in range(len(pending_tool_calls) - 1, -1, -1):
            event_tool = _tool_name(pending_tool_calls[index])
            if event_tool == tool_name:
                return pending_tool_calls.pop(index)
    return pending_tool_calls.pop() if pending_tool_calls else None


def _tool_name(event: dict[str, Any] | None) -> str | None:
    if not isinstance(event, dict):
        return None
    tool = event.get("tool")
    if isinstance(tool, str) and tool:
        return tool
    name = event.get("name")
    if isinstance(name, str) and name:
        return name
    return None


def _event_step_name(event: dict[str, Any], *, step_type: str) -> str:
    if step_type == "tool_call":
        return _tool_name(event) or "Tool Call"
    if step_type == "prompt":
        prompt_name = event.get("name")
        if isinstance(prompt_name, str) and prompt_name:
            return prompt_name
        return "Prompt"
    if step_type == "failure":
        return _tool_name(event) or str(event.get("name") or "Failure")
    name = event.get("name")
    if isinstance(name, str) and name:
        return name
    if step_type == "mutation":
        mutation_name = _event_mutation_name(event, step_type=step_type)
        if mutation_name:
            return mutation_name
    return step_type.replace("_", " ").title()


def _event_mutation_name(event: dict[str, Any], *, step_type: str) -> str | None:
    mutation_name = event.get("mutation_name")
    if isinstance(mutation_name, str) and mutation_name:
        return mutation_name
    if step_type == "mutation":
        name = event.get("name")
        if isinstance(name, str) and name:
            return name
    return None


def _event_input_payload(event: dict[str, Any], *, step_type: str) -> Any | None:
    if step_type == "tool_call":
        args = event.get("args")
        return args if isinstance(args, dict) else None
    if step_type in {"prompt", "llm_call", "agent_output", "mutation", "retry"}:
        if "input" in event:
            return event.get("input")
    return None


def _event_output_payload(event: dict[str, Any], *, step_type: str) -> Any | None:
    if step_type == "tool_call":
        if "result" in event:
            return event.get("result")
        if "output" in event:
            return event.get("output")
        return None
    if step_type == "failure":
        if "error" in event:
            return event.get("error")
        if "message" in event:
            return {"message": event.get("message")}
    if "output" in event:
        return event.get("output")
    if "result" in event:
        return event.get("result")
    return None


def _event_status(event: dict[str, Any], *, raw_type: str) -> str:
    raw_status = event.get("status")
    if isinstance(raw_status, str):
        normalized = raw_status.lower().strip()
        if normalized in {_SUCCESS, _ERROR, _TIMEOUT, _RETRY}:
            return normalized
    if raw_type == "retry":
        return _RETRY
    if raw_type in {"error", "failure"}:
        return _TIMEOUT if _looks_like_timeout(event) else _ERROR
    return _SUCCESS


def _looks_like_timeout(event: dict[str, Any]) -> bool:
    error = event.get("error")
    if isinstance(error, dict):
        error_type = error.get("type")
        if isinstance(error_type, str) and "timeout" in error_type.lower():
            return True
        error_message = error.get("message")
        if isinstance(error_message, str) and "timeout" in error_message.lower():
            return True
    message = event.get("message")
    return isinstance(message, str) and "timeout" in message.lower()


def _event_started_at(event: dict[str, Any]) -> datetime:
    started_at = _parse_datetime(event.get("started_at"))
    if started_at is not None:
        return started_at
    timestamp = _parse_datetime(event.get("timestamp"))
    if timestamp is not None:
        return timestamp
    finished_at = _parse_datetime(event.get("finished_at"))
    if finished_at is not None:
        latency_ms = event.get("latency_ms")
        if isinstance(latency_ms, int | float) and not isinstance(latency_ms, bool):
            return finished_at - timedelta(milliseconds=float(latency_ms))
        return finished_at
    return datetime.now(UTC)


def _event_finished_at(event: dict[str, Any], *, started_at: datetime) -> datetime:
    finished_at = _parse_datetime(event.get("finished_at"))
    if finished_at is not None:
        return finished_at
    latency_ms = event.get("latency_ms")
    if isinstance(latency_ms, int | float) and not isinstance(latency_ms, bool):
        return started_at + timedelta(milliseconds=float(latency_ms))
    timestamp = _parse_datetime(event.get("timestamp"))
    if timestamp is not None:
        return timestamp
    return started_at


def _event_latency_ms(
    event: dict[str, Any],
    *,
    started_at: datetime,
    finished_at: datetime | None,
) -> int | None:
    raw_latency = event.get("latency_ms")
    if isinstance(raw_latency, int | float) and not isinstance(raw_latency, bool):
        return int(raw_latency)
    if finished_at is None:
        return None
    delta_ms = int((finished_at - started_at).total_seconds() * 1000)
    return max(delta_ms, 0)


def _retry_count(event: dict[str, Any]) -> int:
    result = event.get("result")
    if isinstance(result, dict):
        retries = result.get("retries")
        if isinstance(retries, int) and retries > 0:
            return retries
    return 0


def _parse_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value.astimezone(UTC) if value.tzinfo is not None else value.replace(tzinfo=UTC)
    if not isinstance(value, str) or not value.strip():
        return None
    normalized = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def _merge_metadata(
    base: dict[str, Any] | None,
    extra: dict[str, Any] | None,
) -> dict[str, Any] | None:
    merged: dict[str, Any] = {}
    if isinstance(base, dict):
        merged.update(base)
    if isinstance(extra, dict):
        merged.update({key: value for key, value in extra.items() if value is not None})
    return merged or None
