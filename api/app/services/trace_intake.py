from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from app.models import Trace
from app.services.audit_service import create_audit_event
from app.services.trace_step_service import create_trace_steps_for_trace
from app.services.trace_validation import normalized_trace_summary
from app.storage import get_json_object, put_json_object
from sqlalchemy import select
from sqlalchemy.orm import Session


def create_trace(
    db: Session,
    *,
    project_id: UUID,
    payload: Any,
    source: str,
    trace_version: str,
    sdk_meta: str | None = None,
    validation_status: str = "valid",
    validation_errors: list[dict[str, str]] | None = None,
    normalized_payload: dict[str, Any] | None = None,
    actor: str | None = None,
) -> Trace:
    trace_id = uuid4()
    s3_key = f"traces/{trace_id}.json"

    put_json_object(s3_key, payload)

    trace = Trace(
        trace_id=trace_id,
        project_id=project_id,
        source=source,
        trace_version=trace_version,
        sdk_meta=sdk_meta,
        validation_status=validation_status,
        validation_errors=validation_errors,
        normalized_payload=normalized_payload,
        s3_key=s3_key,
    )
    db.add(trace)
    db.flush()
    create_trace_steps_for_trace(
        db,
        trace=trace,
        normalized_payload=normalized_payload,
    )
    db.commit()
    db.refresh(trace)
    create_audit_event(
        db,
        project_id=project_id,
        event_type="trace.created",
        actor=actor,
        metadata={
            "trace_id": str(trace.trace_id),
            "source": trace.source,
            "s3_key": trace.s3_key,
            "trace_version": trace.trace_version,
            "sdk_meta": trace.sdk_meta,
            "validation_status": trace.validation_status,
        },
    )
    return trace


def get_trace(db: Session, *, project_id: UUID, trace_id: UUID) -> Trace | None:
    stmt = select(Trace).where(Trace.trace_id == trace_id, Trace.project_id == project_id)
    return db.scalar(stmt)


def list_traces(
    db: Session,
    *,
    project_id: UUID,
    limit: int = 50,
    offset: int = 0,
) -> list[Trace]:
    stmt = (
        select(Trace)
        .where(Trace.project_id == project_id)
        .order_by(Trace.created_at.desc(), Trace.trace_id.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(db.scalars(stmt))


def get_trace_payload(trace: Trace) -> Any | None:
    try:
        return get_json_object(trace.s3_key)
    except Exception:
        return None


def trace_metadata(trace: Trace, *, payload: Any | None = None) -> dict[str, Any]:
    task_name: str | None = None
    if isinstance(trace.normalized_payload, dict):
        task = trace.normalized_payload.get("task")
        if isinstance(task, dict):
            task_name_value = task.get("name")
            if isinstance(task_name_value, str) and task_name_value.strip():
                task_name = task_name_value
    return {
        "trace_id": trace.trace_id,
        "source": trace.source,
        "trace_version": trace.trace_version,
        "task_name": task_name,
        "sdk_meta": trace.sdk_meta,
        "validation_status": trace.validation_status,
        "validation_errors": trace.validation_errors,
        "normalized_summary": normalized_trace_summary(trace.normalized_payload),
        "s3_key": trace.s3_key,
        "payload": payload,
        "created_at": trace.created_at,
    }
