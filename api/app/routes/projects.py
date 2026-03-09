from __future__ import annotations

from typing import Annotated

from app.auth import TenantAuthContext, get_tenant_auth, require_role
from app.db import get_db
from app.schemas import ProjectCreateRequest, ProjectMetadata
from app.services.project_service import create_project, list_projects_for_tenant
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/projects", tags=["projects"])

DbSession = Annotated[Session, Depends(get_db)]
TenantAuth = Annotated[TenantAuthContext, Depends(get_tenant_auth)]
AdminAuth = Annotated[TenantAuthContext, Depends(require_role("admin"))]


def _to_project_metadata(project) -> ProjectMetadata:
    return ProjectMetadata(
        project_id=project.project_id,
        tenant_id=project.tenant_id,
        name=project.name,
        created_at=project.created_at,
    )


@router.get("", response_model=list[ProjectMetadata])
def get_projects(db: DbSession, tenant_auth: TenantAuth) -> list[ProjectMetadata]:
    records = list_projects_for_tenant(db, tenant_id=tenant_auth.tenant_id)
    return [_to_project_metadata(record) for record in records]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ProjectMetadata)
def post_project(
    payload: ProjectCreateRequest, db: DbSession, tenant_auth: AdminAuth
) -> ProjectMetadata:
    record = create_project(db, tenant_id=tenant_auth.tenant_id, name=payload.name)
    return _to_project_metadata(record)
