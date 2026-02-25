from __future__ import annotations

from uuid import UUID, uuid4

from app.models import Campaign
from sqlalchemy.orm import Session


def create_campaign(db: Session, *, name: str, mutation_set: object, eval_set: object) -> Campaign:
    campaign = Campaign(
        campaign_id=uuid4(),
        name=name,
        mutation_set=mutation_set,
        eval_set=eval_set,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


def get_campaign(db: Session, campaign_id: UUID) -> Campaign | None:
    return db.get(Campaign, campaign_id)
