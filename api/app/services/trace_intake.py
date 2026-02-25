from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from app.models import Trace
from app.storage import put_json_object
from sqlalchemy.orm import Session


def create_trace(db: Session, payload: Any, source: str = "api") -> Trace:
    trace_id = uuid4()
    s3_key = f"traces/{trace_id}.json"

    put_json_object(s3_key, payload)

    trace = Trace(trace_id=trace_id, source=source, s3_key=s3_key)
    db.add(trace)
    db.commit()
    db.refresh(trace)
    return trace


def get_trace(db: Session, trace_id: UUID) -> Trace | None:
    return db.get(Trace, trace_id)


def trace_metadata(trace: Trace) -> dict[str, Any]:
    return {
        "trace_id": trace.trace_id,
        "source": trace.source,
        "s3_key": trace.s3_key,
        "created_at": trace.created_at,
    }
