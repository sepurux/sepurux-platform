from __future__ import annotations

from typing import Annotated
from uuid import UUID

from app.auth import ProjectScope, TenantAuthContext, require_project_scope, require_role
from app.db import get_db
from app.schemas import (
    ScheduledCampaignCreateRequest,
    ScheduledCampaignMetadata,
    ScheduledCampaignUpdateRequest,
)
from app.services.scheduled_campaign_service import (
    create_scheduled_campaign,
    delete_scheduled_campaign,
    get_scheduled_campaign,
    list_scheduled_campaigns,
    resolve_campaign_for_project,
    resolve_mutation_pack_for_project,
    update_scheduled_campaign,
)
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/scheduled-campaigns", tags=["scheduled-campaigns"])

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]
DeveloperAuth = Annotated[TenantAuthContext, Depends(require_role("developer"))]


def _to_metadata(record) -> ScheduledCampaignMetadata:
    return ScheduledCampaignMetadata(
        scheduled_campaign_id=record.scheduled_campaign_id,
        project_id=record.project_id,
        campaign_id=record.campaign_id,
        mutation_pack_id=record.mutation_pack_id,
        cron_schedule=record.cron_schedule,
        enabled=record.enabled,
        last_run_at=record.last_run_at,
        last_run_status=record.last_run_status,
        created_at=record.created_at,
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ScheduledCampaignMetadata)
def post_scheduled_campaign(
    payload: ScheduledCampaignCreateRequest,
    db: DbSession,
    project_scope: ProjectScopeDep,
    tenant_auth: DeveloperAuth,
) -> ScheduledCampaignMetadata:
    if resolve_campaign_for_project(
        db, project_id=project_scope.project_id, campaign_id=payload.campaign_id
    ) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    if resolve_mutation_pack_for_project(
        db, project_id=project_scope.project_id, mutation_pack_id=payload.mutation_pack_id
    ) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Mutation pack not found"
        )

    record = create_scheduled_campaign(
        db,
        project_id=project_scope.project_id,
        campaign_id=payload.campaign_id,
        mutation_pack_id=payload.mutation_pack_id,
        cron_schedule=payload.cron_schedule,
        enabled=payload.enabled,
    )
    return _to_metadata(record)


@router.get("", response_model=list[ScheduledCampaignMetadata])
def get_scheduled_campaigns(
    db: DbSession,
    project_scope: ProjectScopeDep,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[ScheduledCampaignMetadata]:
    records = list_scheduled_campaigns(
        db,
        project_id=project_scope.project_id,
        limit=limit,
        offset=offset,
    )
    return [_to_metadata(r) for r in records]


@router.get("/{scheduled_campaign_id}", response_model=ScheduledCampaignMetadata)
def get_scheduled_campaign_by_id(
    scheduled_campaign_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
) -> ScheduledCampaignMetadata:
    record = get_scheduled_campaign(
        db,
        project_id=project_scope.project_id,
        scheduled_campaign_id=scheduled_campaign_id,
    )
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Scheduled campaign not found"
        )
    return _to_metadata(record)


@router.patch("/{scheduled_campaign_id}", response_model=ScheduledCampaignMetadata)
def patch_scheduled_campaign(
    scheduled_campaign_id: UUID,
    payload: ScheduledCampaignUpdateRequest,
    db: DbSession,
    project_scope: ProjectScopeDep,
    tenant_auth: DeveloperAuth,
) -> ScheduledCampaignMetadata:
    record = get_scheduled_campaign(
        db,
        project_id=project_scope.project_id,
        scheduled_campaign_id=scheduled_campaign_id,
    )
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Scheduled campaign not found"
        )
    record = update_scheduled_campaign(
        db,
        record=record,
        enabled=payload.enabled,
        cron_schedule=payload.cron_schedule,
    )
    return _to_metadata(record)


@router.delete("/{scheduled_campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scheduled_campaign_by_id(
    scheduled_campaign_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
    tenant_auth: DeveloperAuth,
) -> Response:
    deleted = delete_scheduled_campaign(
        db,
        project_id=project_scope.project_id,
        scheduled_campaign_id=scheduled_campaign_id,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Scheduled campaign not found"
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
