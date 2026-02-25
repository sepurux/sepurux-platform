from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID

from app.db import get_db
from app.schemas import TraceMetadata
from app.services.trace_intake import create_trace, trace_metadata
from app.services.trace_intake import get_trace as get_trace_record
from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/traces", tags=["traces"])

DbSession = Annotated[Session, Depends(get_db)]
JsonPayload = Annotated[Any, Body()]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=TraceMetadata)
def post_trace(
    payload: JsonPayload,
    db: DbSession,
) -> TraceMetadata:
    trace = create_trace(db=db, payload=payload)
    return TraceMetadata(**trace_metadata(trace))


@router.get("/{trace_id}", response_model=TraceMetadata)
def get_trace_by_id(trace_id: UUID, db: DbSession) -> TraceMetadata:
    trace = get_trace_record(db=db, trace_id=trace_id)
    if trace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trace not found")
    return TraceMetadata(**trace_metadata(trace))
