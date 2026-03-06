from __future__ import annotations

from typing import Annotated
from uuid import UUID

from app.auth import ProjectScope, require_project_scope
from app.db import get_db
from app.schemas import (
    PolicyPackCreateRequest,
    PolicyPackMetadata,
    PolicyPackRollbackRequest,
    PolicyPackUpdateRequest,
    PolicyPackVersionMetadata,
)
from app.services.audit_service import actor_from_request
from app.services.policy_service import (
    create_policy_pack,
    get_policy_pack,
    get_policy_pack_active_version,
    get_policy_pack_active_version_number,
    list_policy_pack_versions,
    list_policy_packs,
    rollback_policy_pack,
    update_policy_pack,
)
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/policy-packs", tags=["policy-packs"])

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]


def _to_policy_pack_metadata(db: Session, record) -> PolicyPackMetadata:
    active_version = get_policy_pack_active_version(
        db,
        policy_pack=record,
        create_if_missing=False,
    )
    policy_payload = active_version.policy if active_version is not None else record.policy
    return PolicyPackMetadata(
        policy_pack_id=record.policy_pack_id,
        project_id=record.project_id,
        name=record.name,
        engine=record.engine,
        policy=policy_payload,
        active_version_id=record.active_version_id,
        active_version_number=get_policy_pack_active_version_number(
            db,
            policy_pack=record,
            create_if_missing=False,
        ),
        created_at=record.created_at,
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=PolicyPackMetadata)
def post_policy_pack(
    payload: PolicyPackCreateRequest,
    db: DbSession,
    project_scope: ProjectScopeDep,
    request: Request,
) -> PolicyPackMetadata:
    record = create_policy_pack(
        db,
        project_id=project_scope.project_id,
        name=payload.name,
        engine=payload.engine,
        policy=payload.policy,
        actor=actor_from_request(request),
    )
    return _to_policy_pack_metadata(db, record)


@router.get("", response_model=list[PolicyPackMetadata])
def get_policy_packs(db: DbSession, project_scope: ProjectScopeDep) -> list[PolicyPackMetadata]:
    records = list_policy_packs(db, project_id=project_scope.project_id)
    return [_to_policy_pack_metadata(db, record) for record in records]


@router.get("/{policy_pack_id}", response_model=PolicyPackMetadata)
def get_policy_pack_by_id(
    policy_pack_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
) -> PolicyPackMetadata:
    record = get_policy_pack(
        db,
        project_id=project_scope.project_id,
        policy_pack_id=policy_pack_id,
    )
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy pack not found")
    return _to_policy_pack_metadata(db, record)


def _to_policy_pack_version_metadata(
    version, *, active_version_id: UUID | None
) -> PolicyPackVersionMetadata:
    return PolicyPackVersionMetadata(
        version_id=version.version_id,
        policy_pack_id=version.policy_pack_id,
        version_number=version.version_number,
        policy=version.policy,
        created_by=version.created_by,
        created_at=version.created_at,
        is_active=bool(active_version_id == version.version_id),
    )


@router.patch("/{policy_pack_id}", response_model=PolicyPackMetadata)
@router.put("/{policy_pack_id}", response_model=PolicyPackMetadata)
def patch_policy_pack(
    policy_pack_id: UUID,
    payload: PolicyPackUpdateRequest,
    db: DbSession,
    project_scope: ProjectScopeDep,
    request: Request,
) -> PolicyPackMetadata:
    record = update_policy_pack(
        db,
        project_id=project_scope.project_id,
        policy_pack_id=policy_pack_id,
        name=payload.name,
        engine=payload.engine,
        policy=payload.policy,
        created_by=payload.created_by,
        actor=actor_from_request(request),
    )
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy pack not found")
    return _to_policy_pack_metadata(db, record)


@router.post("/{policy_pack_id}/rollback", response_model=PolicyPackMetadata)
def post_policy_pack_rollback(
    policy_pack_id: UUID,
    payload: PolicyPackRollbackRequest,
    db: DbSession,
    project_scope: ProjectScopeDep,
    request: Request,
) -> PolicyPackMetadata:
    record = rollback_policy_pack(
        db,
        project_id=project_scope.project_id,
        policy_pack_id=policy_pack_id,
        version_number=payload.version_number,
        actor=actor_from_request(request),
    )
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy pack or version not found",
        )
    return _to_policy_pack_metadata(db, record)


@router.get("/{policy_pack_id}/versions", response_model=list[PolicyPackVersionMetadata])
def get_policy_pack_versions(
    policy_pack_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
) -> list[PolicyPackVersionMetadata]:
    record = get_policy_pack(
        db,
        project_id=project_scope.project_id,
        policy_pack_id=policy_pack_id,
    )
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy pack not found")

    versions = list_policy_pack_versions(
        db,
        project_id=project_scope.project_id,
        policy_pack_id=policy_pack_id,
    )
    return [
        _to_policy_pack_version_metadata(version, active_version_id=record.active_version_id)
        for version in versions
    ]
