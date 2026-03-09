from __future__ import annotations

from typing import Annotated

from app.auth import TenantAuthContext, get_tenant_auth, require_role
from app.db import get_db
from app.schemas import ApiKeyCreateRequest, ApiKeyCreateResponse, ApiKeyMetadata
from app.services.api_key_service import create_api_key_for_tenant, list_api_keys_for_tenant
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/api-keys", tags=["api-keys"])

DbSession = Annotated[Session, Depends(get_db)]
TenantAuth = Annotated[TenantAuthContext, Depends(get_tenant_auth)]
AdminAuth = Annotated[TenantAuthContext, Depends(require_role("admin"))]


def _to_api_key_metadata(record) -> ApiKeyMetadata:
    return ApiKeyMetadata(
        api_key_id=record.api_key_id,
        tenant_id=record.tenant_id,
        project_id=record.project_id,
        user_id=record.user_id,
        name=record.name,
        is_demo=bool(record.is_demo),
        rate_limit_per_minute=int(record.rate_limit_per_minute or 120),
        created_at=record.created_at,
        last_used_at=record.last_used_at,
        revoked_at=record.revoked_at,
    )


@router.get("", response_model=list[ApiKeyMetadata])
def get_api_keys(db: DbSession, tenant_auth: AdminAuth) -> list[ApiKeyMetadata]:
    records = list_api_keys_for_tenant(db, tenant_id=tenant_auth.tenant_id)
    return [_to_api_key_metadata(record) for record in records]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ApiKeyCreateResponse)
def post_api_key(
    payload: ApiKeyCreateRequest, db: DbSession, tenant_auth: AdminAuth
) -> ApiKeyCreateResponse:
    if tenant_auth.is_demo:
        raise HTTPException(status_code=403, detail="Demo users cannot create API keys")

    project_id = payload.project_id or tenant_auth.project_id
    record, plaintext = create_api_key_for_tenant(
        db,
        tenant_id=tenant_auth.tenant_id,
        project_id=project_id,
        user_id=tenant_auth.user_id,
        name=payload.name,
        rate_limit_per_minute=payload.rate_limit_per_minute,
    )
    metadata = _to_api_key_metadata(record)
    return ApiKeyCreateResponse(**metadata.model_dump(), api_key=plaintext)
