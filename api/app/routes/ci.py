from __future__ import annotations

from typing import Annotated, Any, Literal
from uuid import UUID

from app.db import get_db
from app.schemas import CIRunCreateRequest, CIRunCreateResponse, CIRunStatusResponse
from app.services.run_service import (
    RelatedRecordNotFoundError,
    create_ci_run_and_enqueue,
    get_run_quality_metrics,
    get_run_unscoped,
)
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/ci", tags=["ci"])

DbSession = Annotated[Session, Depends(get_db)]
_DONE_STATUSES = {"completed", "done"}
CIDecision = Literal["pass", "fail", "pending"]


@router.post("/runs", status_code=status.HTTP_201_CREATED, response_model=CIRunCreateResponse)
def post_ci_run(payload: CIRunCreateRequest, db: DbSession) -> CIRunCreateResponse:
    try:
        thresholds_payload = (
            payload.thresholds.model_dump()
            if hasattr(payload.thresholds, "model_dump")
            else payload.thresholds.dict()
        )
        run = create_ci_run_and_enqueue(
            db,
            trace_id=payload.trace_id,
            campaign_id=payload.campaign_id,
            thresholds=thresholds_payload,
        )
    except RelatedRecordNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return CIRunCreateResponse(run_id=run.run_id)


@router.get("/runs/{run_id}", response_model=CIRunStatusResponse)
def get_ci_run(run_id: UUID, request: Request, db: DbSession) -> CIRunStatusResponse:
    run = get_run_unscoped(db, run_id=run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    thresholds = _extract_ci_thresholds(run.summary)
    if thresholds is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CI thresholds not found")

    metrics = get_run_quality_metrics(db, run_id=run.run_id, project_id=run.project_id)
    decision = _ci_decision(
        status=run.status,
        pass_rate=float(metrics["pass_rate"]),
        unsafe_attempts=int(metrics["unsafe_count"]),
        failures=int(metrics["failed_count"]),
        thresholds=thresholds,
    )

    return CIRunStatusResponse(
        run_id=run.run_id,
        status=run.status,
        decision=decision,
        pass_rate=float(metrics["pass_rate"]),
        unsafe_attempts=int(metrics["unsafe_count"]),
        failures_by_tool=metrics["failures_by_tool"][:3],
        dashboard_url=_build_dashboard_url(request, run.run_id),
    )


def _extract_ci_thresholds(summary: Any) -> dict[str, Any] | None:
    if not isinstance(summary, dict):
        return None
    thresholds = summary.get("ci_thresholds")
    if not isinstance(thresholds, dict):
        return None
    required = {"min_pass_rate", "max_unsafe"}
    if not required.issubset(thresholds.keys()):
        return None
    return thresholds


def _ci_decision(
    *,
    status: str,
    pass_rate: float,
    unsafe_attempts: int,
    failures: int,
    thresholds: dict[str, Any],
) -> CIDecision:
    if (status or "").lower() not in _DONE_STATUSES:
        return "pending"

    min_pass_rate = float(thresholds["min_pass_rate"])
    max_unsafe = int(thresholds["max_unsafe"])
    max_failures_raw = thresholds.get("max_failures")
    max_failures = None if max_failures_raw is None else int(max_failures_raw)

    if pass_rate < min_pass_rate:
        return "fail"
    if unsafe_attempts > max_unsafe:
        return "fail"
    if max_failures is not None and failures > max_failures:
        return "fail"
    return "pass"


def _build_dashboard_url(request: Request, run_id: UUID) -> str:
    base = str(request.base_url).rstrip("/")
    return f"{base}/v1/runs/{run_id}"
