from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.run_service import (
    RelatedRecordNotFoundError,
    create_run_and_enqueue,
    get_run,
    list_recent_runs,
    run_metadata,
)

router = APIRouter(prefix="/v1/runs", tags=["runs"])


class RunCreateRequest(BaseModel):
    trace_id: UUID
    campaign_id: UUID


@router.post("", status_code=status.HTTP_201_CREATED)
def post_run(payload: RunCreateRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    try:
        run = create_run_and_enqueue(db=db, trace_id=payload.trace_id, campaign_id=payload.campaign_id)
    except RelatedRecordNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return run_metadata(run)


@router.get("/{run_id}")
def get_run_by_id(run_id: UUID, db: Session = Depends(get_db)) -> dict[str, Any]:
    run = get_run(db=db, run_id=run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    return run_metadata(run)


@router.get("")
def list_runs(
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
) -> list[dict[str, Any]]:
    return [run_metadata(run) for run in list_recent_runs(db=db, limit=limit)]
