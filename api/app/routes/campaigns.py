from __future__ import annotations

from typing import Annotated
from uuid import UUID

from app.auth import ProjectScope, require_project_scope
from app.db import get_db
from app.schemas import CampaignCreateRequest, CampaignMetadata
from app.services.audit_service import actor_from_request
from app.services.campaign_service import create_campaign
from app.services.campaign_service import get_campaign as get_campaign_record
from app.services.campaign_service import list_campaigns as list_campaign_records
from app.services.mutation_pack_service import get_mutation_pack
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/campaigns", tags=["campaigns"])

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]


def _to_campaign_metadata(campaign) -> CampaignMetadata:
    return CampaignMetadata(
        campaign_id=campaign.campaign_id,
        mutation_pack_id=campaign.mutation_pack_id,
        name=campaign.name,
        mutation_set=campaign.mutation_set,
        eval_set=campaign.eval_set,
        created_at=campaign.created_at,
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=CampaignMetadata)
def post_campaign(
    payload: CampaignCreateRequest,
    db: DbSession,
    project_scope: ProjectScopeDep,
    request: Request,
) -> CampaignMetadata:
    if payload.mutation_pack_id is not None and (
        get_mutation_pack(
            db,
            project_id=project_scope.project_id,
            mutation_pack_id=payload.mutation_pack_id,
        )
        is None
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mutation pack not found")

    campaign = create_campaign(
        db,
        project_id=project_scope.project_id,
        name=payload.name,
        mutation_set=payload.mutation_set,
        eval_set=payload.eval_set,
        mutation_pack_id=payload.mutation_pack_id,
        actor=actor_from_request(request),
    )
    return _to_campaign_metadata(campaign)


@router.get("", response_model=list[CampaignMetadata])
def get_campaigns(
    db: DbSession,
    project_scope: ProjectScopeDep,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[CampaignMetadata]:
    records = list_campaign_records(
        db,
        project_id=project_scope.project_id,
        limit=limit,
        offset=offset,
    )
    return [_to_campaign_metadata(record) for record in records]


@router.get("/{campaign_id}", response_model=CampaignMetadata)
def get_campaign(
    campaign_id: UUID, db: DbSession, project_scope: ProjectScopeDep
) -> CampaignMetadata:
    campaign = get_campaign_record(db, project_id=project_scope.project_id, campaign_id=campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return _to_campaign_metadata(campaign)
