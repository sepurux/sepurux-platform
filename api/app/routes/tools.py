from __future__ import annotations

from typing import Annotated
from uuid import UUID

from app.auth import ProjectScope, require_project_scope
from app.db import get_db
from app.schemas import (
    ToolRegistryCreateRequest,
    ToolRegistryMetadata,
    ToolRegistryZoneUpdateRequest,
)
from app.services.tool_registry_service import (
    ToolRegistryNotFoundError,
    create_or_update_tool_registry_entry,
    list_tool_registry_entries,
    update_tool_registry_zone,
)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/tools", tags=["tools"])

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]


def _to_tool_registry_metadata(record) -> ToolRegistryMetadata:
    return ToolRegistryMetadata(
        tool_id=record.tool_id,
        project_id=record.project_id,
        name=record.name,
        zone=record.zone,
        created_at=record.created_at,
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ToolRegistryMetadata)
def post_tool_registry_entry(
    payload: ToolRegistryCreateRequest,
    db: DbSession,
    project_scope: ProjectScopeDep,
) -> ToolRegistryMetadata:
    record = create_or_update_tool_registry_entry(
        db,
        project_id=project_scope.project_id,
        name=payload.name,
        zone=payload.zone,
    )
    return _to_tool_registry_metadata(record)


@router.get("", response_model=list[ToolRegistryMetadata])
def get_tool_registry_entries(
    db: DbSession,
    project_scope: ProjectScopeDep,
) -> list[ToolRegistryMetadata]:
    records = list_tool_registry_entries(db, project_id=project_scope.project_id)
    return [_to_tool_registry_metadata(record) for record in records]


@router.patch("/{tool_id}", response_model=ToolRegistryMetadata)
def patch_tool_registry_entry(
    tool_id: UUID,
    payload: ToolRegistryZoneUpdateRequest,
    db: DbSession,
    project_scope: ProjectScopeDep,
) -> ToolRegistryMetadata:
    try:
        record = update_tool_registry_zone(
            db,
            project_id=project_scope.project_id,
            tool_id=tool_id,
            zone=payload.zone,
        )
    except ToolRegistryNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return _to_tool_registry_metadata(record)
