from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID

from app.auth import ProjectScope, TenantAuthContext, require_project_scope, require_role
from app.db import get_db
from app.schemas import TraceMetadata, TraceTimelineStep
from app.services.audit_service import actor_from_request
from app.services.demo_service import enforce_demo_trace_upload_limits
from app.services.trace_intake import create_trace, get_trace_payload, list_traces, trace_metadata
from app.services.trace_intake import get_trace as get_trace_record
from app.services.trace_step_service import ensure_trace_steps_for_trace, serialize_trace_step
from app.services.trace_validation import validate_and_normalize_trace
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/traces", tags=["traces"])

DbSession = Annotated[Session, Depends(get_db)]
JsonPayload = Annotated[Any, Body()]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]
DeveloperAuth = Annotated[TenantAuthContext, Depends(require_role("developer"))]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=TraceMetadata)
def post_trace(
    payload: JsonPayload,
    db: DbSession,
    project_scope: ProjectScopeDep,
    tenant_auth: DeveloperAuth,
    request: Request,
) -> TraceMetadata | JSONResponse:
    if tenant_auth.is_demo:
        enforce_demo_trace_upload_limits(
            db,
            project_id=project_scope.project_id,
            payload=payload,
        )

    normalized_payload, validation_issues = validate_and_normalize_trace(payload)
    if validation_issues:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "invalid_trace",
                "details": validation_issues,
            },
        )
    if normalized_payload is None:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "invalid_trace",
                "details": [{"path": "$", "message": "trace normalization failed"}],
            },
        )

    sdk_meta = request.headers.get("X-Sepurux-SDK")
    if isinstance(sdk_meta, str):
        sdk_meta = sdk_meta.strip() or None

    trace = create_trace(
        db=db,
        project_id=project_scope.project_id,
        payload=payload,
        source=str(normalized_payload["source"]),
        trace_version=str(normalized_payload["trace_version"]),
        sdk_meta=sdk_meta,
        validation_status="valid",
        normalized_payload=normalized_payload,
        actor=actor_from_request(request),
    )
    return TraceMetadata(**trace_metadata(trace))


@router.get("", response_model=list[TraceMetadata])
def get_traces(
    db: DbSession,
    project_scope: ProjectScopeDep,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[TraceMetadata]:
    records = list_traces(
        db=db,
        project_id=project_scope.project_id,
        limit=limit,
        offset=offset,
    )
    return [TraceMetadata(**trace_metadata(record)) for record in records]


@router.get("/{trace_id}", response_model=TraceMetadata)
def get_trace_by_id(
    trace_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
    include_payload: bool = Query(False),
) -> TraceMetadata:
    trace = get_trace_record(db=db, project_id=project_scope.project_id, trace_id=trace_id)
    if trace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trace not found")
    payload = get_trace_payload(trace) if include_payload else None
    return TraceMetadata(**trace_metadata(trace, payload=payload))


@router.get("/{trace_id}/timeline", response_model=list[TraceTimelineStep])
def get_trace_timeline(
    trace_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
) -> list[TraceTimelineStep]:
    trace = get_trace_record(db=db, project_id=project_scope.project_id, trace_id=trace_id)
    if trace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trace not found")
    steps = ensure_trace_steps_for_trace(db, trace=trace)
    return [TraceTimelineStep(**serialize_trace_step(step)) for step in steps]
