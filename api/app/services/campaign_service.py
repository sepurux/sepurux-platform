from __future__ import annotations

from uuid import UUID, uuid4

from app.models import Campaign
from sqlalchemy import select
from sqlalchemy.orm import Session


def create_campaign(
    db: Session,
    *,
    project_id: UUID,
    name: str,
    mutation_set: object,
    eval_set: object,
) -> Campaign:
    campaign = Campaign(
        campaign_id=uuid4(),
        project_id=project_id,
        name=name,
        mutation_set=mutation_set,
        eval_set=eval_set,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


def get_campaign(db: Session, *, project_id: UUID, campaign_id: UUID) -> Campaign | None:
    stmt = select(Campaign).where(
        Campaign.campaign_id == campaign_id,
        Campaign.project_id == project_id,
    )
    return db.scalar(stmt)
