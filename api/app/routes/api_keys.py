from __future__ import annotations

from typing import Annotated

from app.auth import TenantAuthContext, get_tenant_auth
from app.db import get_db
from app.schemas import ApiKeyCreateRequest, ApiKeyCreateResponse, ApiKeyMetadata
from app.services.api_key_service import create_api_key_for_tenant, list_api_keys_for_tenant
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/api-keys", tags=["api-keys"])

DbSession = Annotated[Session, Depends(get_db)]
TenantAuth = Annotated[TenantAuthContext, Depends(get_tenant_auth)]


def _to_api_key_metadata(record) -> ApiKeyMetadata:
    return ApiKeyMetadata(
        api_key_id=record.api_key_id,
        tenant_id=record.tenant_id,
        name=record.name,
        created_at=record.created_at,
        last_used_at=record.last_used_at,
        revoked_at=record.revoked_at,
    )


@router.get("", response_model=list[ApiKeyMetadata])
def get_api_keys(db: DbSession, tenant_auth: TenantAuth) -> list[ApiKeyMetadata]:
    records = list_api_keys_for_tenant(db, tenant_id=tenant_auth.tenant_id)
    return [_to_api_key_metadata(record) for record in records]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ApiKeyCreateResponse)
def post_api_key(
    payload: ApiKeyCreateRequest, db: DbSession, tenant_auth: TenantAuth
) -> ApiKeyCreateResponse:
    record, plaintext = create_api_key_for_tenant(
        db, tenant_id=tenant_auth.tenant_id, name=payload.name
    )
    metadata = _to_api_key_metadata(record)
    return ApiKeyCreateResponse(**metadata.model_dump(), api_key=plaintext)
