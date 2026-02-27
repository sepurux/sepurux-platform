from __future__ import annotations

from typing import Annotated
from uuid import UUID

from app.auth import ProjectScope, require_project_scope
from app.db import get_db
from app.schemas import PolicyPackCreateRequest, PolicyPackMetadata
from app.services.policy_service import create_policy_pack, get_policy_pack, list_policy_packs
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/policy-packs", tags=["policy-packs"])

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]


def _to_policy_pack_metadata(record) -> PolicyPackMetadata:
    return PolicyPackMetadata(
        policy_pack_id=record.policy_pack_id,
        project_id=record.project_id,
        name=record.name,
        version=record.version,
        policy=record.policy,
        created_at=record.created_at,
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=PolicyPackMetadata)
def post_policy_pack(
    payload: PolicyPackCreateRequest,
    db: DbSession,
    project_scope: ProjectScopeDep,
) -> PolicyPackMetadata:
    record = create_policy_pack(
        db,
        project_id=project_scope.project_id,
        name=payload.name,
        version=payload.version,
        policy=payload.policy,
    )
    return _to_policy_pack_metadata(record)


@router.get("", response_model=list[PolicyPackMetadata])
def get_policy_packs(db: DbSession, project_scope: ProjectScopeDep) -> list[PolicyPackMetadata]:
    records = list_policy_packs(db, project_id=project_scope.project_id)
    return [_to_policy_pack_metadata(record) for record in records]


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
    return _to_policy_pack_metadata(record)
