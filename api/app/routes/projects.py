from __future__ import annotations

from typing import Annotated

from app.auth import TenantAuthContext, get_tenant_auth, require_role
from app.db import get_db
from app.models import Project, Tenant
from app.schemas import ProjectCreateRequest, ProjectMetadata
from app.services.billing_service import get_billing_snapshot_for_context
from app.services.internal_audit_service import create_audit_log
from app.services.pricing_service import normalize_pricing_tier
from app.services.project_service import create_project, list_projects_for_tenant
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
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


def _actor_from_tenant_auth(tenant_auth: TenantAuthContext) -> str:
    if tenant_auth.user_id is not None:
        return str(tenant_auth.user_id)
    if tenant_auth.api_key_name:
        return tenant_auth.api_key_name
    return str(tenant_auth.api_key_id)


@router.get("", response_model=list[ProjectMetadata])
def get_projects(db: DbSession, tenant_auth: TenantAuth) -> list[ProjectMetadata]:
    if tenant_auth.project_id is not None:
        scoped_project = db.scalar(
            select(Project).where(
                Project.tenant_id == tenant_auth.tenant_id,
                Project.project_id == tenant_auth.project_id,
            )
        )
        return [_to_project_metadata(scoped_project)] if isinstance(scoped_project, Project) else []

    records = list_projects_for_tenant(db, tenant_id=tenant_auth.tenant_id)
    return [_to_project_metadata(record) for record in records]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ProjectMetadata)
def post_project(
    payload: ProjectCreateRequest, db: DbSession, tenant_auth: AdminAuth
) -> ProjectMetadata:
    tenant_project = db.scalar(
        select(Project)
        .where(Project.tenant_id == tenant_auth.tenant_id)
        .order_by(Project.created_at.asc(), Project.project_id.asc())
    )
    if not isinstance(tenant_project, Project):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workspace context unavailable for project creation.",
        )

    billing_snapshot = get_billing_snapshot_for_context(
        db,
        tenant_auth=tenant_auth,
        project_id=tenant_project.project_id,
    )
    subscription = (
        billing_snapshot.get("subscription") if isinstance(billing_snapshot, dict) else None
    )
    plan_name = (
        str(subscription.get("plan_name") or "").strip().lower()
        if isinstance(subscription, dict)
        else ""
    )
    has_workspace_addon = plan_name in {"team", "enterprise"}
    if not has_workspace_addon:
        tenant = db.scalar(select(Tenant).where(Tenant.tenant_id == tenant_auth.tenant_id))
        tenant_tier = normalize_pricing_tier(
            tenant.pricing_tier if isinstance(tenant, Tenant) else None
        )
        has_workspace_addon = tenant_tier in {"team", "enterprise"}

    if not has_workspace_addon:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Upgrade to Team or Enterprise to add workspaces.",
        )

    record = create_project(db, tenant_id=tenant_auth.tenant_id, name=payload.name)
    create_audit_log(
        db,
        action="project.create",
        actor=_actor_from_tenant_auth(tenant_auth),
        entity=f"project:{record.project_id}",
        metadata={
            "tenant_id": str(tenant_auth.tenant_id),
            "project_id": str(record.project_id),
            "project_name": record.name,
        },
    )
    db.commit()
    return _to_project_metadata(record)
