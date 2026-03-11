from __future__ import annotations

from typing import Annotated

from app.auth import ProjectScope, TenantAuthContext, get_tenant_auth, require_project_scope
from app.db import get_db
from app.schemas import AuthSessionMetadata, AuthSessionResponse, LoginRequest, SignupRequest
from app.services.auth_service import login_user, session_metadata, signup_user
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

public_router = APIRouter(prefix="/auth", tags=["auth"])
router = APIRouter(prefix="/v1/auth", tags=["auth"])

DbSession = Annotated[Session, Depends(get_db)]
TenantAuth = Annotated[TenantAuthContext, Depends(get_tenant_auth)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]


@public_router.post(
    "/signup", status_code=status.HTTP_201_CREATED, response_model=AuthSessionResponse
)
def post_signup(payload: SignupRequest, db: DbSession) -> AuthSessionResponse:
    return AuthSessionResponse.model_validate(
        signup_user(
            db,
            email=payload.email,
            password=payload.password,
            name=payload.name,
            project_name=payload.project_name,
        )
    )


@public_router.post("/login", response_model=AuthSessionResponse)
def post_login(payload: LoginRequest, db: DbSession) -> AuthSessionResponse:
    return AuthSessionResponse.model_validate(
        login_user(
            db,
            email=payload.email,
            password=payload.password,
        )
    )


@router.get("/session", response_model=AuthSessionMetadata)
def get_auth_session(
    db: DbSession,
    tenant_auth: TenantAuth,
    project_scope: ProjectScopeDep,
) -> AuthSessionMetadata:
    return AuthSessionMetadata.model_validate(
        session_metadata(
            db,
            tenant_auth=tenant_auth,
            project_id=project_scope.project_id,
        )
    )
