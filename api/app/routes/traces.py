from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.trace_intake import create_trace, get_trace, trace_metadata

router = APIRouter(prefix="/v1/traces", tags=["traces"])


@router.post("", status_code=status.HTTP_201_CREATED)
def post_trace(
    payload: Any = Body(...),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    trace = create_trace(db=db, payload=payload)
    return trace_metadata(trace)


@router.get("/{trace_id}")
def get_trace_by_id(trace_id: UUID, db: Session = Depends(get_db)) -> dict[str, Any]:
    trace = get_trace(db=db, trace_id=trace_id)
    if trace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trace not found")
    return trace_metadata(trace)
