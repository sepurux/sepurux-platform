from __future__ import annotations

import hashlib
import hmac
import json
import secrets
from datetime import datetime, timezone
from uuid import UUID, uuid4
from urllib.parse import urlparse

import httpx
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


def send_test_webhook(
    db: Session,
    *,
    project_id: UUID,
    webhook_id: UUID,
) -> dict[str, object] | None:
    record = get_webhook(db, project_id=project_id, webhook_id=webhook_id)
    if record is None:
        return None

    attempted_at = datetime.now(timezone.utc)
    delivery_id = str(uuid4())
    event_type = "webhook.test"
    payload = {
        "id": delivery_id,
        "type": event_type,
        "created_at": attempted_at.isoformat(),
        "project_id": str(record.project_id),
        "webhook_id": str(record.webhook_id),
        "data": {
            "message": "Sepurux test delivery",
            "configured_events": _normalize_events(list(record.events or [])),
        },
    }
    body = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    timestamp = str(int(attempted_at.timestamp()))
    signature = _sign_webhook_payload(secret=record.secret, timestamp=timestamp, body=body)
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Sepurux-Webhooks/1.0",
        "X-Sepurux-Delivery": delivery_id,
        "X-Sepurux-Event": event_type,
        "X-Sepurux-Timestamp": timestamp,
        "X-Sepurux-Signature": f"sha256={signature}",
        "X-Sepurux-Webhook": str(record.webhook_id),
    }

    try:
        response = httpx.post(
            record.url,
            content=body,
            headers=headers,
            timeout=10.0,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        status_code = exc.response.status_code if exc.response is not None else None
        message = str(exc)
        record.last_error = message[:1000]
        db.add(record)
        db.commit()
        db.refresh(record)
        return {
            "webhook_id": record.webhook_id,
            "delivery_id": delivery_id,
            "event_type": event_type,
            "delivered": False,
            "status_code": status_code,
            "message": message,
            "attempted_at": attempted_at,
        }

    record.last_success_at = attempted_at
    record.last_error = None
    db.add(record)
    db.commit()
    db.refresh(record)
    return {
        "webhook_id": record.webhook_id,
        "delivery_id": delivery_id,
        "event_type": event_type,
        "delivered": True,
        "status_code": response.status_code,
        "message": f"Delivered test event to {record.url}",
        "attempted_at": attempted_at,
    }


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


def _sign_webhook_payload(*, secret: str, timestamp: str, body: bytes) -> str:
    payload = timestamp.encode("utf-8") + b"." + body
    return hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
