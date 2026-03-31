from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import NewsletterCampaign, User
from app.schemas import (
    InternalNewsletterAudienceSummary,
    InternalNewsletterCampaignEntry,
    InternalNewsletterOverview,
)
from app.services.user_notification_service import (
    build_newsletter_email,
    parse_marketing_unsubscribe_token,
    send_email,
)


def _campaign_entry(record: NewsletterCampaign) -> InternalNewsletterCampaignEntry:
    return InternalNewsletterCampaignEntry(
        newsletter_campaign_id=record.newsletter_campaign_id,
        audience="subscribed_users",
        subject=record.subject,
        preview_text=record.preview_text,
        eyebrow=record.eyebrow,
        title=record.title,
        summary=record.summary,
        body=record.body,
        cta_label=record.cta_label,
        cta_url=record.cta_url,
        sent_by=record.sent_by,
        recipients_count=record.recipients_count,
        delivered_count=record.delivered_count,
        created_at=record.created_at,
        sent_at=record.sent_at,
    )


def get_newsletter_audience_summary(db: Session) -> InternalNewsletterAudienceSummary:
    total_users = int(db.scalar(select(func.count()).select_from(User)) or 0)
    subscribed_users = int(
        db.scalar(
            select(func.count()).select_from(User).where(User.marketing_emails_enabled.is_(True))
        )
        or 0
    )
    return InternalNewsletterAudienceSummary(
        total_users=total_users,
        subscribed_users=subscribed_users,
        unsubscribed_users=max(total_users - subscribed_users, 0),
    )


def list_newsletter_campaigns(
    db: Session,
    *,
    limit: int = 12,
) -> list[InternalNewsletterCampaignEntry]:
    records = list(
        db.scalars(
            select(NewsletterCampaign)
            .order_by(NewsletterCampaign.created_at.desc(), NewsletterCampaign.newsletter_campaign_id.desc())
            .limit(max(1, min(limit, 50)))
        )
    )
    return [_campaign_entry(record) for record in records]


def get_newsletter_overview(db: Session) -> InternalNewsletterOverview:
    return InternalNewsletterOverview(
        audience=get_newsletter_audience_summary(db),
        campaigns=list_newsletter_campaigns(db),
    )


def send_newsletter_campaign(
    db: Session,
    *,
    subject: str,
    preview_text: str | None,
    eyebrow: str | None,
    title: str,
    summary: str | None,
    body: str,
    cta_label: str | None,
    cta_url: str | None,
    sent_by: str,
) -> InternalNewsletterCampaignEntry:
    recipients = list(
        db.scalars(
            select(User)
            .where(User.marketing_emails_enabled.is_(True))
            .order_by(User.created_at.asc(), User.user_id.asc())
        )
    )
    if not recipients:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No subscribed users are available for newsletter delivery",
        )

    sent_at = datetime.now(UTC)
    campaign = NewsletterCampaign(
        newsletter_campaign_id=uuid4(),
        audience="subscribed_users",
        subject=subject.strip(),
        preview_text=preview_text.strip() if isinstance(preview_text, str) and preview_text.strip() else None,
        eyebrow=eyebrow.strip() if isinstance(eyebrow, str) and eyebrow.strip() else None,
        title=title.strip(),
        summary=summary.strip() if isinstance(summary, str) and summary.strip() else None,
        body=body.strip(),
        cta_label=cta_label.strip() if isinstance(cta_label, str) and cta_label.strip() else None,
        cta_url=cta_url.strip() if isinstance(cta_url, str) and cta_url.strip() else None,
        sent_by=sent_by,
        recipients_count=len(recipients),
        delivered_count=0,
        sent_at=sent_at,
    )
    db.add(campaign)
    db.flush()

    delivered_count = 0
    for user in recipients:
        text_body, html_body = build_newsletter_email(
            recipient_email=user.email,
            recipient_name=user.name,
            user_id=user.user_id,
            subject=campaign.subject,
            preview_text=campaign.preview_text,
            eyebrow=campaign.eyebrow,
            title=campaign.title,
            summary=campaign.summary,
            body=campaign.body,
            cta_label=campaign.cta_label,
            cta_url=campaign.cta_url,
        )
        if send_email(
            to_email=user.email,
            subject=campaign.subject,
            text_body=text_body,
            html_body=html_body,
        ):
            delivered_count += 1

    campaign.delivered_count = delivered_count
    db.add(campaign)
    db.flush()
    return _campaign_entry(campaign)


def unsubscribe_from_marketing_email(db: Session, *, token: str) -> str:
    try:
        user_id, email = parse_marketing_unsubscribe_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    user = db.scalar(select(User).where(User.user_id == user_id, User.email == email))
    if not isinstance(user, User):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscriber not found")

    if user.marketing_emails_enabled:
        user.marketing_emails_enabled = False
        user.marketing_unsubscribed_at = datetime.now(UTC)
        db.add(user)
        db.commit()
    return user.email
