from __future__ import annotations

from typing import Annotated
from uuid import UUID

from app.auth import ProjectScope, require_project_scope
from app.db import get_db
from app.schemas import (
    HardeningTemplateCreateRequest,
    HardeningTemplateMetadata,
)
from app.services.template_service import (
    create_template,
    get_template,
    list_templates,
)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/templates", tags=["templates"])

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]


def _to_template_metadata(record) -> HardeningTemplateMetadata:
    return HardeningTemplateMetadata(
        template_id=record.template_id,
        project_id=record.project_id,
        name=record.name,
        type=record.type,
        config=record.config,
        created_at=record.created_at,
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=HardeningTemplateMetadata)
def post_template(
    payload: HardeningTemplateCreateRequest,
    db: DbSession,
    project_scope: ProjectScopeDep,
) -> HardeningTemplateMetadata:
    record = create_template(
        db,
        project_id=project_scope.project_id,
        name=payload.name,
        template_type=payload.type,
        config=payload.config,
    )
    return _to_template_metadata(record)


@router.get("", response_model=list[HardeningTemplateMetadata])
def get_templates(db: DbSession, project_scope: ProjectScopeDep) -> list[HardeningTemplateMetadata]:
    records = list_templates(db, project_id=project_scope.project_id)
    return [_to_template_metadata(record) for record in records]


@router.get("/{template_id}", response_model=HardeningTemplateMetadata)
def get_template_by_id(
    template_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
) -> HardeningTemplateMetadata:
    record = get_template(db, project_id=project_scope.project_id, template_id=template_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return _to_template_metadata(record)
