from __future__ import annotations

from typing import Annotated
from uuid import UUID

from app.auth import ProjectScope, require_project_scope
from app.db import get_db
from app.schemas import MutationPackCreateRequest, MutationPackMetadata
from app.services.mutation_pack_service import (
    create_mutation_pack,
    get_mutation_pack,
    list_mutation_packs,
)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/mutation-packs", tags=["mutation-packs"])

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]


def _to_mutation_pack_metadata(record) -> MutationPackMetadata:
    return MutationPackMetadata(
        mutation_pack_id=record.mutation_pack_id,
        project_id=record.project_id,
        name=record.name,
        description=record.description,
        config=record.config,
        created_at=record.created_at,
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=MutationPackMetadata)
def post_mutation_pack(
    payload: MutationPackCreateRequest,
    db: DbSession,
    project_scope: ProjectScopeDep,
) -> MutationPackMetadata:
    record = create_mutation_pack(
        db,
        project_id=project_scope.project_id,
        name=payload.name,
        description=payload.description,
        config=payload.config,
    )
    return _to_mutation_pack_metadata(record)


@router.get("", response_model=list[MutationPackMetadata])
def get_mutation_packs(
    db: DbSession,
    project_scope: ProjectScopeDep,
) -> list[MutationPackMetadata]:
    records = list_mutation_packs(db, project_id=project_scope.project_id)
    return [_to_mutation_pack_metadata(record) for record in records]


@router.get("/{mutation_pack_id}", response_model=MutationPackMetadata)
def get_mutation_pack_by_id(
    mutation_pack_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
) -> MutationPackMetadata:
    record = get_mutation_pack(
        db,
        project_id=project_scope.project_id,
        mutation_pack_id=mutation_pack_id,
    )
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mutation pack not found",
        )
    return _to_mutation_pack_metadata(record)
