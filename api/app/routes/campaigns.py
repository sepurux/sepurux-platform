from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Campaign

router = APIRouter(prefix="/v1/campaigns", tags=["campaigns"])


class CampaignCreateRequest(BaseModel):
    name: str
    mutation_set: Any
    eval_set: Any


def campaign_metadata(campaign: Campaign) -> dict[str, Any]:
    return {
        "campaign_id": campaign.campaign_id,
        "name": campaign.name,
        "mutation_set": campaign.mutation_set,
        "eval_set": campaign.eval_set,
        "created_at": campaign.created_at,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_campaign(payload: CampaignCreateRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    campaign = Campaign(
        campaign_id=uuid4(),
        name=payload.name,
        mutation_set=payload.mutation_set,
        eval_set=payload.eval_set,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign_metadata(campaign)


@router.get("/{campaign_id}")
def get_campaign(campaign_id: UUID, db: Session = Depends(get_db)) -> dict[str, Any]:
    campaign = db.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return campaign_metadata(campaign)
