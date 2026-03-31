from __future__ import annotations

from typing import Annotated
from uuid import UUID

from app.auth import ProjectScope, require_project_scope, require_visible_section
from app.db import get_db
from app.schemas import (
    WebhookCreateRequest,
    WebhookCreateResponse,
    WebhookMetadata,
    WebhookRotateSecretResponse,
    WebhookTestDeliveryResponse,
    WebhookUpdateRequest,
)
from app.services.webhook_service import (
    create_webhook,
    get_webhook,
    list_webhooks,
    rotate_webhook_secret,
    send_test_webhook,
    update_webhook,
)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/webhooks", tags=["webhooks"])

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]
WebhookAccessDep = Annotated[ProjectScope, Depends(require_visible_section("webhooks"))]


def _events_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    out: list[str] = []
    for item in value:
        if isinstance(item, str) and item:
            out.append(item)
    return out


def _to_webhook_metadata(record) -> WebhookMetadata:
    return WebhookMetadata(
        webhook_id=record.webhook_id,
        project_id=record.project_id,
        url=record.url,
        is_enabled=record.is_enabled,
        events=_events_list(record.events),
        created_at=record.created_at,
        last_success_at=record.last_success_at,
        last_error=record.last_error,
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=WebhookCreateResponse)
def post_webhook(
    payload: WebhookCreateRequest,
    db: DbSession,
    project_scope: ProjectScopeDep,
    _webhook_access: WebhookAccessDep,
) -> WebhookCreateResponse:
    try:
        record, secret = create_webhook(
            db,
            project_id=project_scope.project_id,
            url=payload.url,
            events=payload.events,
            is_enabled=payload.is_enabled,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    base = _to_webhook_metadata(record)
    return WebhookCreateResponse(**base.model_dump(), secret=secret)


@router.get("", response_model=list[WebhookMetadata])
def get_webhooks(
    db: DbSession,
    project_scope: ProjectScopeDep,
    _webhook_access: WebhookAccessDep,
) -> list[WebhookMetadata]:
    records = list_webhooks(db, project_id=project_scope.project_id)
    return [_to_webhook_metadata(record) for record in records]


@router.patch("/{webhook_id}", response_model=WebhookMetadata)
def patch_webhook(
    webhook_id: UUID,
    payload: WebhookUpdateRequest,
    db: DbSession,
    project_scope: ProjectScopeDep,
    _webhook_access: WebhookAccessDep,
) -> WebhookMetadata:
    try:
        record = update_webhook(
            db,
            project_id=project_scope.project_id,
            webhook_id=webhook_id,
            url=payload.url,
            events=payload.events,
            is_enabled=payload.is_enabled,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")
    return _to_webhook_metadata(record)


@router.post("/{webhook_id}/rotate-secret", response_model=WebhookRotateSecretResponse)
def post_rotate_webhook_secret(
    webhook_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
    _webhook_access: WebhookAccessDep,
) -> WebhookRotateSecretResponse:
    rotated = rotate_webhook_secret(
        db,
        project_id=project_scope.project_id,
        webhook_id=webhook_id,
    )
    if rotated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")
    record, secret = rotated
    return WebhookRotateSecretResponse(webhook_id=record.webhook_id, secret=secret)


@router.get("/{webhook_id}", response_model=WebhookMetadata)
def get_webhook_by_id(
    webhook_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
    _webhook_access: WebhookAccessDep,
) -> WebhookMetadata:
    record = get_webhook(db, project_id=project_scope.project_id, webhook_id=webhook_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")
    return _to_webhook_metadata(record)


@router.post("/{webhook_id}/test", response_model=WebhookTestDeliveryResponse)
def post_test_webhook(
    webhook_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
    _webhook_access: WebhookAccessDep,
) -> WebhookTestDeliveryResponse:
    attempted = send_test_webhook(
        db,
        project_id=project_scope.project_id,
        webhook_id=webhook_id,
    )
    if attempted is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")
    return WebhookTestDeliveryResponse(**attempted)
