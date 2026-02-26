from __future__ import annotations

from typing import Annotated
from uuid import UUID

from app.auth import ProjectScope, require_project_scope
from app.db import get_db
from app.schemas import CampaignCreateRequest, CampaignMetadata
from app.services.campaign_service import create_campaign
from app.services.campaign_service import get_campaign as get_campaign_record
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/campaigns", tags=["campaigns"])

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]


def _to_campaign_metadata(campaign) -> CampaignMetadata:
    return CampaignMetadata(
        campaign_id=campaign.campaign_id,
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
) -> CampaignMetadata:
    campaign = create_campaign(
        db,
        project_id=project_scope.project_id,
        name=payload.name,
        mutation_set=payload.mutation_set,
        eval_set=payload.eval_set,
    )
    return _to_campaign_metadata(campaign)


@router.get("/{campaign_id}", response_model=CampaignMetadata)
def get_campaign(
    campaign_id: UUID, db: DbSession, project_scope: ProjectScopeDep
) -> CampaignMetadata:
    campaign = get_campaign_record(db, project_id=project_scope.project_id, campaign_id=campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return _to_campaign_metadata(campaign)
