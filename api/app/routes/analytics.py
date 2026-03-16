from __future__ import annotations

from typing import Annotated
from uuid import UUID

from app.auth import ProjectScope, TenantAuthContext, get_tenant_auth, require_project_scope
from app.db import get_db
from app.schemas import (
    MutationSummaryResponse,
    ProjectReliabilitySummaryResponse,
    RunStatsResponse,
    ToolFragilityResponse,
)
from app.services.analytics_service import (
    RunNotFoundError,
    get_mutation_summary,
    get_project_reliability_summary,
    get_run_stats,
    get_tool_fragility,
)
from app.services.billing_service import resolve_billable_user_id
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1", tags=["analytics"])

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]
TenantAuthDep = Annotated[TenantAuthContext, Depends(get_tenant_auth)]


@router.get("/runs/{run_id}/stats", response_model=RunStatsResponse)
def get_run_stats_endpoint(
    run_id: UUID, db: DbSession, project_scope: ProjectScopeDep
) -> RunStatsResponse:
    try:
        return RunStatsResponse(
            **get_run_stats(db, project_id=project_scope.project_id, run_id=run_id)
        )
    except RunNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/tools/fragility", response_model=ToolFragilityResponse)
def get_tools_fragility_endpoint(
    db: DbSession,
    project_scope: ProjectScopeDep,
    window_days: int = Query(7, ge=1, le=365),
    limit: int = Query(20, ge=1, le=200),
) -> ToolFragilityResponse:
    return ToolFragilityResponse(
        **get_tool_fragility(
            db,
            project_id=project_scope.project_id,
            window_days=window_days,
            limit=limit,
        )
    )


@router.get("/mutations/summary", response_model=MutationSummaryResponse)
def get_mutations_summary_endpoint(
    db: DbSession,
    project_scope: ProjectScopeDep,
    window_days: int = Query(7, ge=1, le=365),
    limit: int = Query(20, ge=1, le=200),
) -> MutationSummaryResponse:
    return MutationSummaryResponse(
        **get_mutation_summary(
            db,
            project_id=project_scope.project_id,
            window_days=window_days,
            limit=limit,
        )
    )


@router.get("/analytics/reliability", response_model=ProjectReliabilitySummaryResponse)
def get_project_reliability_summary_endpoint(
    db: DbSession,
    project_scope: ProjectScopeDep,
    tenant_auth: TenantAuthDep,
) -> ProjectReliabilitySummaryResponse:
    billable_user_id = resolve_billable_user_id(
        db,
        tenant_auth=tenant_auth,
        project_id=project_scope.project_id,
    )
    summary = get_project_reliability_summary(
        db,
        project_id=project_scope.project_id,
        billable_user_id=billable_user_id,
    )
    return ProjectReliabilitySummaryResponse(**summary)
