from __future__ import annotations

from uuid import UUID, uuid4

from app.models import Campaign, MutationPack, ScheduledCampaign
from sqlalchemy import select
from sqlalchemy.orm import Session


def create_scheduled_campaign(
    db: Session,
    *,
    project_id: UUID,
    campaign_id: UUID,
    mutation_pack_id: UUID,
    cron_schedule: str,
    enabled: bool = True,
) -> ScheduledCampaign:
    record = ScheduledCampaign(
        scheduled_campaign_id=uuid4(),
        project_id=project_id,
        campaign_id=campaign_id,
        mutation_pack_id=mutation_pack_id,
        cron_schedule=cron_schedule,
        enabled=enabled,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_scheduled_campaigns(
    db: Session,
    *,
    project_id: UUID,
    limit: int = 50,
    offset: int = 0,
) -> list[ScheduledCampaign]:
    return list(
        db.scalars(
            select(ScheduledCampaign)
            .where(ScheduledCampaign.project_id == project_id)
            .order_by(ScheduledCampaign.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
    )


def get_scheduled_campaign(
    db: Session,
    *,
    project_id: UUID,
    scheduled_campaign_id: UUID,
) -> ScheduledCampaign | None:
    return db.scalar(
        select(ScheduledCampaign).where(
            ScheduledCampaign.scheduled_campaign_id == scheduled_campaign_id,
            ScheduledCampaign.project_id == project_id,
        )
    )


def update_scheduled_campaign(
    db: Session,
    *,
    record: ScheduledCampaign,
    enabled: bool | None = None,
    cron_schedule: str | None = None,
) -> ScheduledCampaign:
    if enabled is not None:
        record.enabled = enabled
    if cron_schedule is not None:
        record.cron_schedule = cron_schedule
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def delete_scheduled_campaign(
    db: Session,
    *,
    project_id: UUID,
    scheduled_campaign_id: UUID,
) -> bool:
    record = get_scheduled_campaign(
        db, project_id=project_id, scheduled_campaign_id=scheduled_campaign_id
    )
    if record is None:
        return False
    db.delete(record)
    db.commit()
    return True


def resolve_campaign_for_project(
    db: Session, *, project_id: UUID, campaign_id: UUID
) -> Campaign | None:
    return db.scalar(
        select(Campaign).where(
            Campaign.campaign_id == campaign_id,
            Campaign.project_id == project_id,
        )
    )


def resolve_mutation_pack_for_project(
    db: Session, *, project_id: UUID, mutation_pack_id: UUID
) -> MutationPack | None:
    return db.scalar(
        select(MutationPack).where(
            MutationPack.mutation_pack_id == mutation_pack_id,
            MutationPack.project_id == project_id,
        )
    )
