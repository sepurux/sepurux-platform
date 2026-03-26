from __future__ import annotations

from typing import Annotated

from app.auth import ProjectScope, require_visible_section
from app.db import get_db
from app.schemas import ComplianceSummaryResponse
from app.services.compliance_service import compliance_summary
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/compliance", tags=["compliance"])

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_visible_section("audit"))]


@router.get("/summary", response_model=ComplianceSummaryResponse)
def get_compliance_summary(
    db: DbSession,
    project_scope: ProjectScopeDep,
    window_days: int = Query(30, ge=1, le=365),
    top_n: int = Query(5, ge=1, le=20),
) -> ComplianceSummaryResponse:
    payload = compliance_summary(
        db,
        project_id=project_scope.project_id,
        window_days=window_days,
        top_n=top_n,
    )
    return ComplianceSummaryResponse.model_validate(payload)
