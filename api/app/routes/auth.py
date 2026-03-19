from __future__ import annotations

from typing import Annotated

from app.auth import ProjectScope, TenantAuthContext, get_tenant_auth, require_project_scope
from app.db import get_db
from app.schemas import (
    AuthSessionMetadata,
    AuthSessionResponse,
    ForgotPasswordRequest,
    LoginRequest,
    OAuthSessionExchangeRequest,
    OperationMessageResponse,
    ResetPasswordRequest,
    SignupRequest,
)
from app.services.auth_service import (
    login_user,
    request_password_reset,
    reset_password_with_token,
    session_metadata,
    signup_user,
)
from app.services.oauth_service import (
    OAuthFlowError,
    build_oauth_return_url,
    complete_oauth_login,
    exchange_oauth_session,
    start_oauth_login,
)
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import RedirectResponse
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
            pricing_tier=payload.pricing_tier,
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


@public_router.post("/forgot-password", response_model=OperationMessageResponse)
def post_forgot_password(
    payload: ForgotPasswordRequest,
    db: DbSession,
) -> OperationMessageResponse:
    return OperationMessageResponse(
        message=request_password_reset(
            db,
            email=payload.email,
        )
    )


@public_router.post("/reset-password", response_model=OperationMessageResponse)
def post_reset_password(
    payload: ResetPasswordRequest,
    db: DbSession,
) -> OperationMessageResponse:
    return OperationMessageResponse(
        message=reset_password_with_token(
            db,
            token=payload.token,
            new_password=payload.password,
        )
    )


@public_router.get("/oauth/{provider}/start")
def get_oauth_start(
    provider: str,
    db: DbSession,
    next_path: Annotated[str | None, Query(alias="next")] = None,
) -> RedirectResponse:
    try:
        redirect_url = start_oauth_login(db, provider=provider, next_path=next_path)
    except OAuthFlowError as exc:
        redirect_url = build_oauth_return_url(
            next_path=next_path or "/dashboard",
            error_message=str(exc),
        )
    return RedirectResponse(
        url=redirect_url,
        status_code=status.HTTP_302_FOUND,
    )


@public_router.get("/oauth/{provider}/callback")
def get_oauth_callback(
    provider: str,
    db: DbSession,
    state: str | None = None,
    code: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    return RedirectResponse(
        url=complete_oauth_login(
            db,
            provider=provider,
            state_token=state,
            code=code,
            error=error,
        ),
        status_code=status.HTTP_303_SEE_OTHER,
    )


@public_router.post("/oauth/exchange", response_model=AuthSessionResponse)
def post_oauth_exchange(
    payload: OAuthSessionExchangeRequest,
    db: DbSession,
) -> AuthSessionResponse:
    return AuthSessionResponse.model_validate(exchange_oauth_session(db, token=payload.token))


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
