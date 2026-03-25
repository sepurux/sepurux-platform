from __future__ import annotations

from uuid import UUID, uuid4

from app.models import Campaign
from app.services.audit_service import create_audit_event
from sqlalchemy import select
from sqlalchemy.orm import Session


def create_campaign(
    db: Session,
    *,
    project_id: UUID,
    name: str,
    mutation_set: object,
    eval_set: object,
    mutation_pack_id: UUID | None = None,
    actor: str | None = None,
) -> Campaign:
    campaign = Campaign(
        campaign_id=uuid4(),
        project_id=project_id,
        mutation_pack_id=mutation_pack_id,
        name=name,
        mutation_set=mutation_set,
        eval_set=eval_set,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    create_audit_event(
        db,
        project_id=project_id,
        event_type="campaign.created",
        actor=actor,
        metadata={
            "campaign_id": str(campaign.campaign_id),
            "name": campaign.name,
            "mutation_pack_id": (
                str(campaign.mutation_pack_id) if campaign.mutation_pack_id is not None else None
            ),
        },
    )
    return campaign


def get_campaign(
    db: Session,
    *,
    project_id: UUID,
    campaign_id: UUID,
    include_archived: bool = False,
) -> Campaign | None:
    stmt = select(Campaign).where(
        Campaign.campaign_id == campaign_id,
        Campaign.project_id == project_id,
    )
    if not include_archived:
        stmt = stmt.where(Campaign.status != "archived")
    return db.scalar(stmt)


def list_campaigns(
    db: Session,
    *,
    project_id: UUID,
    limit: int = 50,
    offset: int = 0,
    include_archived: bool = False,
) -> list[Campaign]:
    stmt = select(Campaign).where(Campaign.project_id == project_id)
    if not include_archived:
        stmt = stmt.where(Campaign.status != "archived")
    stmt = (
        stmt.order_by(Campaign.created_at.desc(), Campaign.campaign_id.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(db.scalars(stmt))


def archive_campaign(
    db: Session,
    *,
    project_id: UUID,
    campaign_id: UUID,
    actor: str | None = None,
) -> Campaign | None:
    stmt = select(Campaign).where(
        Campaign.campaign_id == campaign_id,
        Campaign.project_id == project_id,
    )
    campaign = db.scalar(stmt)
    if campaign is None:
        return None
    if campaign.status != "archived":
        campaign.status = "archived"
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
        create_audit_event(
            db,
            project_id=project_id,
            event_type="campaign.archived",
            actor=actor,
            metadata={
                "campaign_id": str(campaign.campaign_id),
                "name": campaign.name,
                "status": campaign.status,
            },
        )
    return campaign
