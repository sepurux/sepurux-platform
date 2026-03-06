from __future__ import annotations

import secrets
from urllib.parse import urlparse
from uuid import UUID, uuid4

from app.models import Webhook
from sqlalchemy import select
from sqlalchemy.orm import Session


def create_webhook(
    db: Session,
    *,
    project_id: UUID,
    url: str,
    events: list[str],
    is_enabled: bool,
) -> tuple[Webhook, str]:
    normalized_url = _normalize_webhook_url(url)
    normalized_events = _normalize_events(events)
    secret = generate_webhook_secret()

    record = Webhook(
        webhook_id=uuid4(),
        project_id=project_id,
        url=normalized_url,
        secret=secret,
        is_enabled=is_enabled,
        events=normalized_events,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record, secret


def list_webhooks(db: Session, *, project_id: UUID) -> list[Webhook]:
    stmt = (
        select(Webhook)
        .where(Webhook.project_id == project_id)
        .order_by(Webhook.created_at.desc(), Webhook.webhook_id.desc())
    )
    return list(db.scalars(stmt))


def get_webhook(db: Session, *, project_id: UUID, webhook_id: UUID) -> Webhook | None:
    stmt = select(Webhook).where(
        Webhook.project_id == project_id,
        Webhook.webhook_id == webhook_id,
    )
    return db.scalar(stmt)


def update_webhook(
    db: Session,
    *,
    project_id: UUID,
    webhook_id: UUID,
    url: str | None = None,
    events: list[str] | None = None,
    is_enabled: bool | None = None,
) -> Webhook | None:
    record = get_webhook(db, project_id=project_id, webhook_id=webhook_id)
    if record is None:
        return None

    if url is not None:
        record.url = _normalize_webhook_url(url)
    if events is not None:
        record.events = _normalize_events(events)
    if is_enabled is not None:
        record.is_enabled = is_enabled

    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def rotate_webhook_secret(
    db: Session,
    *,
    project_id: UUID,
    webhook_id: UUID,
) -> tuple[Webhook, str] | None:
    record = get_webhook(db, project_id=project_id, webhook_id=webhook_id)
    if record is None:
        return None

    secret = generate_webhook_secret()
    record.secret = secret
    db.add(record)
    db.commit()
    db.refresh(record)
    return record, secret


def generate_webhook_secret() -> str:
    return f"whsec_{secrets.token_urlsafe(32)}"


def _normalize_events(events: list[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for raw in events:
        item = raw.strip()
        if not item or item in seen:
            continue
        seen.add(item)
        out.append(item)
    return out


def _normalize_webhook_url(url: str) -> str:
    candidate = url.strip()
    parsed = urlparse(candidate)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Webhook URL must be a valid http(s) URL")
    return candidate
