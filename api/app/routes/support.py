from __future__ import annotations

from typing import Annotated

from app.auth import ProjectScope, TenantAuthContext, require_project_scope, require_role
from app.db import get_db
from app.models import Project, User
from app.schemas import BugReportCreateRequest, OperationMessageResponse
from app.services.user_notification_service import send_bug_report_notification
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/support", tags=["support"])

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]
TenantAuth = Annotated[TenantAuthContext, Depends(require_role("viewer"))]


@router.post("/bug-reports", response_model=OperationMessageResponse)
def post_bug_report(
    payload: BugReportCreateRequest,
    db: DbSession,
    project_scope: ProjectScopeDep,
    tenant_auth: TenantAuth,
) -> OperationMessageResponse:
    user = None
    if tenant_auth.user_id is not None:
        user = db.scalar(select(User).where(User.user_id == tenant_auth.user_id))
    project = db.scalar(select(Project).where(Project.project_id == project_scope.project_id))

    delivered = send_bug_report_notification(
        reporter_name=user.name if user is not None else None,
        reporter_email=user.email if user is not None else None,
        reporter_role=tenant_auth.role_name,
        project_name=project.name if project is not None else None,
        category=payload.category,
        title=payload.title,
        description=payload.description,
        page_url=payload.page_url,
        reported_at=payload.reported_at.isoformat(),
        viewport_width=payload.viewport_width,
        viewport_height=payload.viewport_height,
        screenshot_data_url=payload.screenshot_data_url,
    )
    if not delivered:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Bug report delivery is unavailable right now. Please try again shortly.",
        )
    return OperationMessageResponse(message="Bug report submitted.")
