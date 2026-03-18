from __future__ import annotations

from typing import Annotated
from uuid import UUID, uuid4

from app.auth import ProjectScope, TenantAuthContext, generate_api_key, hash_api_key, require_project_scope, require_role
from app.db import get_db
from app.models import ApiKey, ProjectMembership, Role, User
from app.schemas import MemberInviteRequest, MemberMetadata
from app.services.auth_service import ROLE_IDS, _get_or_create_role
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/members", tags=["members"])

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]
AdminAuth = Annotated[TenantAuthContext, Depends(require_role("admin"))]


def _role_name_for_id(role_id: UUID) -> str:
    for name, rid in ROLE_IDS.items():
        if rid == role_id:
            return name
    return "viewer"


def _to_member_metadata(user: User, role_id: UUID, api_key: str | None = None) -> MemberMetadata:
    return MemberMetadata(
        user_id=user.user_id,
        email=user.email,
        name=user.name,
        role=_role_name_for_id(role_id),
        api_key=api_key,
        created_at=user.created_at,
    )


@router.get("", response_model=list[MemberMetadata])
def list_members(
    db: DbSession,
    project_scope: ProjectScopeDep,
) -> list[MemberMetadata]:
    memberships = db.scalars(
        select(ProjectMembership).where(
            ProjectMembership.project_id == project_scope.project_id
        )
    ).all()

    result = []
    for m in memberships:
        user = db.get(User, m.user_id)
        if isinstance(user, User):
            result.append(_to_member_metadata(user, m.role_id))
    return result


@router.post("", status_code=status.HTTP_201_CREATED, response_model=MemberMetadata)
def invite_member(
    payload: MemberInviteRequest,
    db: DbSession,
    project_scope: ProjectScopeDep,
    tenant_auth: AdminAuth,
) -> MemberMetadata:
    # Check plan allows team members (starter plan is solo only)
    from app.models import Tenant
    tenant = db.get(Tenant, tenant_auth.tenant_id)
    if isinstance(tenant, Tenant) and tenant.pricing_tier == "starter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Upgrade to Team or Enterprise to invite members.",
        )

    # Check email not already a member
    existing_user = db.scalar(select(User).where(User.email == payload.email))
    if isinstance(existing_user, User):
        existing_membership = db.scalar(
            select(ProjectMembership).where(
                ProjectMembership.user_id == existing_user.user_id,
                ProjectMembership.project_id == project_scope.project_id,
            )
        )
        if existing_membership is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User is already a member of this project.",
            )
        user = existing_user
    else:
        user = User(user_id=uuid4(), email=payload.email, name=payload.name)
        db.add(user)
        db.flush()

    role = _get_or_create_role(db, payload.role)
    membership = ProjectMembership(
        user_id=user.user_id,
        project_id=project_scope.project_id,
        role_id=role.role_id,
    )
    db.add(membership)

    # Generate API key for the invited member
    plaintext = generate_api_key()
    api_key_record = ApiKey(
        api_key_id=uuid4(),
        tenant_id=tenant_auth.tenant_id,
        project_id=project_scope.project_id,
        user_id=user.user_id,
        name=f"Invite key for {payload.email}",
        key_hash=hash_api_key(plaintext),
    )
    db.add(api_key_record)
    db.commit()

    return _to_member_metadata(user, role.role_id, api_key=plaintext)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    user_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
    tenant_auth: AdminAuth,
) -> Response:
    # Prevent removing yourself
    if tenant_auth.user_id and UUID(str(tenant_auth.user_id)) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove yourself from the project.",
        )

    membership = db.scalar(
        select(ProjectMembership).where(
            ProjectMembership.user_id == user_id,
            ProjectMembership.project_id == project_scope.project_id,
        )
    )
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found.")

    db.delete(membership)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
