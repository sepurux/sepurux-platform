from __future__ import annotations

import base64
import json
import os
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Literal
from urllib.parse import urlencode
from uuid import uuid4

import httpx
from app.models import AuthSessionExchange, OAuthLoginState, ProjectMembership, User, UserIdentity
from app.services.auth_service import (
    DEFAULT_PRICING_TIER,
    _default_display_name,
    bootstrap_workspace_for_user,
    issue_session_for_user,
    normalize_email,
)
from fastapi import HTTPException, status
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.orm import Session

OAuthProvider = Literal["github", "google", "microsoft"]

STATE_TTL = timedelta(minutes=10)
EXCHANGE_TTL = timedelta(minutes=5)
MICROSOFT_DEFAULT_TENANT = "common"
OAUTH_TIMEOUT_SECONDS = 15.0


@dataclass(frozen=True)
class OAuthIdentity:
    provider: OAuthProvider
    provider_user_id: str
    email: str
    name: str | None
    email_verified: bool


@dataclass(frozen=True)
class OAuthProviderConfig:
    provider: OAuthProvider
    client_id: str
    client_secret: str
    authorize_url: str
    token_url: str
    scopes: tuple[str, ...]


class OAuthFlowError(Exception):
    pass


def start_oauth_login(
    db: Session,
    *,
    provider: str,
    next_path: str | None,
) -> str:
    resolved_provider = _normalize_provider(provider)
    config = _provider_config(resolved_provider)
    state_token = secrets.token_urlsafe(32)
    now = datetime.now(UTC)

    db.add(
        OAuthLoginState(
            state_token=state_token,
            provider=resolved_provider,
            next_path=_normalize_next_path(next_path),
            expires_at=now + STATE_TTL,
        )
    )
    db.commit()

    query: dict[str, str] = {
        "client_id": config.client_id,
        "redirect_uri": _callback_url(resolved_provider),
        "response_type": "code",
        "scope": " ".join(config.scopes),
        "state": state_token,
    }

    if resolved_provider == "github":
        query["allow_signup"] = "true"
    elif resolved_provider == "google":
        query["access_type"] = "online"
        query["prompt"] = "select_account"
    else:
        query["prompt"] = "select_account"

    return f"{config.authorize_url}?{urlencode(query)}"


def complete_oauth_login(
    db: Session,
    *,
    provider: str,
    state_token: str | None,
    code: str | None,
    error: str | None,
) -> str:
    resolved_provider = _normalize_provider(provider)
    next_path = "/dashboard"
    try:
        state = _consume_oauth_state(db, provider=resolved_provider, state_token=state_token)
        next_path = state.next_path
        if error:
            raise OAuthFlowError(_humanize_provider_error(error))
        if not code:
            raise OAuthFlowError("Missing authorization code from identity provider")
        identity = _exchange_identity(
            provider=resolved_provider,
            code=code,
        )
        user = _resolve_user_for_identity(db, identity=identity)
        session_payload = issue_session_for_user(db, user=user, is_demo=False)
        exchange_token = _create_session_exchange(db, session_payload=session_payload)
        return build_oauth_return_url(next_path=next_path, exchange_token=exchange_token)
    except OAuthFlowError as exc:
        return build_oauth_return_url(next_path=next_path, error_message=str(exc))


def exchange_oauth_session(db: Session, *, token: str) -> dict[str, Any]:
    if not token.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="OAuth exchange token is required"
        )

    exchange = db.scalar(
        select(AuthSessionExchange).where(AuthSessionExchange.exchange_token == token.strip())
    )
    if not isinstance(exchange, AuthSessionExchange):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="OAuth exchange token not found"
        )
    if exchange.consumed_at is not None:
        raise HTTPException(
            status_code=status.HTTP_410_GONE, detail="OAuth exchange token has already been used"
        )
    if _is_expired(exchange.expires_at):
        raise HTTPException(
            status_code=status.HTTP_410_GONE, detail="OAuth exchange token has expired"
        )

    exchange.consumed_at = datetime.now(UTC)
    db.add(exchange)
    db.commit()

    payload = exchange.session_payload
    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stored OAuth session payload is invalid",
        )
    return payload


def build_oauth_return_url(
    *,
    next_path: str,
    exchange_token: str | None = None,
    error_message: str | None = None,
) -> str:
    params: dict[str, str] = {
        "mode": "access",
        "intent": "login",
        "next": _normalize_next_path(next_path),
    }
    if exchange_token:
        params["exchange"] = exchange_token
    if error_message:
        params["oauth_error"] = error_message
    return f"{_ui_base_url()}/auth?{urlencode(params)}"


def _normalize_provider(value: str) -> OAuthProvider:
    lowered = value.strip().lower()
    if lowered in {"github", "google", "microsoft"}:
        return lowered
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported OAuth provider")


def _provider_config(provider: OAuthProvider) -> OAuthProviderConfig:
    if provider == "github":
        client_id = _required_env("GITHUB_CLIENT_ID")
        client_secret = _required_env("GITHUB_CLIENT_SECRET")
        return OAuthProviderConfig(
            provider=provider,
            client_id=client_id,
            client_secret=client_secret,
            authorize_url="https://github.com/login/oauth/authorize",
            token_url="https://github.com/login/oauth/access_token",
            scopes=("read:user", "user:email"),
        )
    if provider == "google":
        client_id = _required_env("GOOGLE_CLIENT_ID")
        client_secret = _required_env("GOOGLE_CLIENT_SECRET")
        return OAuthProviderConfig(
            provider=provider,
            client_id=client_id,
            client_secret=client_secret,
            authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            scopes=("openid", "email", "profile"),
        )

    tenant_id = (
        os.getenv("MICROSOFT_TENANT_ID", MICROSOFT_DEFAULT_TENANT).strip()
        or MICROSOFT_DEFAULT_TENANT
    )
    client_id = _required_env("MICROSOFT_CLIENT_ID")
    client_secret = _required_env("MICROSOFT_CLIENT_SECRET")
    return OAuthProviderConfig(
        provider=provider,
        client_id=client_id,
        client_secret=client_secret,
        authorize_url=f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize",
        token_url=f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token",
        scopes=("openid", "email", "profile"),
    )


def _required_env(name: str) -> str:
    value = os.getenv(name)
    if isinstance(value, str) and value.strip():
        return value.strip()
    raise OAuthFlowError(f"{name} is not configured")


def _callback_url(provider: OAuthProvider) -> str:
    return f"{_ui_base_url()}/api/backend/auth/oauth/{provider}/callback"


def _ui_base_url() -> str:
    raw = os.getenv("SEPURUX_UI_BASE_URL") or os.getenv("APP_PUBLIC_URL") or "http://localhost:3000"
    return raw.rstrip("/")


def _normalize_next_path(value: str | None) -> str:
    candidate = (value or "").strip()
    if not candidate.startswith("/"):
        return "/dashboard"
    if candidate.startswith("//"):
        return "/dashboard"
    return candidate


def _consume_oauth_state(
    db: Session,
    *,
    provider: OAuthProvider,
    state_token: str | None,
) -> OAuthLoginState:
    token = (state_token or "").strip()
    if not token:
        raise OAuthFlowError("Missing OAuth state")

    state = db.scalar(select(OAuthLoginState).where(OAuthLoginState.state_token == token))
    if not isinstance(state, OAuthLoginState) or state.provider != provider:
        raise OAuthFlowError("OAuth state was not found")
    if state.consumed_at is not None:
        raise OAuthFlowError("OAuth state has already been used")
    if _is_expired(state.expires_at):
        raise OAuthFlowError("OAuth state has expired")

    state.consumed_at = datetime.now(UTC)
    db.add(state)
    db.commit()
    db.refresh(state)
    return state


def _is_expired(value: datetime) -> bool:
    candidate = value if value.tzinfo is not None else value.replace(tzinfo=UTC)
    return candidate <= datetime.now(UTC)


def _exchange_identity(
    *,
    provider: OAuthProvider,
    code: str,
) -> OAuthIdentity:
    config = _provider_config(provider)
    token = _exchange_code_for_token(config=config, code=code)
    if provider == "github":
        return _fetch_github_identity(access_token=token["access_token"])
    if provider == "google":
        return _fetch_google_identity(token_payload=token)
    return _fetch_microsoft_identity(token_payload=token)


def _exchange_code_for_token(
    *,
    config: OAuthProviderConfig,
    code: str,
) -> dict[str, Any]:
    response = httpx.post(
        config.token_url,
        data={
            "client_id": config.client_id,
            "client_secret": config.client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": _callback_url(config.provider),
        },
        headers={"Accept": "application/json"},
        timeout=OAUTH_TIMEOUT_SECONDS,
    )
    try:
        payload = response.json()
    except json.JSONDecodeError as exc:
        raise OAuthFlowError("Identity provider returned an invalid token response") from exc

    if response.status_code >= 400:
        raise OAuthFlowError(
            _provider_error_message(payload, "Identity provider rejected the login")
        )

    if not isinstance(payload, dict) or not isinstance(payload.get("access_token"), str):
        raise OAuthFlowError("Identity provider did not return an access token")
    return payload


def _fetch_github_identity(*, access_token: str) -> OAuthIdentity:
    user_response = httpx.get(
        "https://api.github.com/user",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {access_token}",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        timeout=OAUTH_TIMEOUT_SECONDS,
    )
    email_response = httpx.get(
        "https://api.github.com/user/emails",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {access_token}",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        timeout=OAUTH_TIMEOUT_SECONDS,
    )

    try:
        user_payload = user_response.json()
        email_payload = email_response.json()
    except json.JSONDecodeError as exc:
        raise OAuthFlowError("GitHub returned an invalid profile response") from exc

    if user_response.status_code >= 400 or email_response.status_code >= 400:
        raise OAuthFlowError("GitHub profile lookup failed")

    if not isinstance(user_payload, dict) or not isinstance(user_payload.get("id"), int):
        raise OAuthFlowError("GitHub profile response was incomplete")

    email = _pick_github_email(email_payload)
    name = user_payload.get("name") if isinstance(user_payload.get("name"), str) else None
    return OAuthIdentity(
        provider="github",
        provider_user_id=str(user_payload["id"]),
        email=email,
        name=name,
        email_verified=True,
    )


def _pick_github_email(payload: Any) -> str:
    if not isinstance(payload, list):
        raise OAuthFlowError("GitHub did not return any email addresses")

    primary_verified = next(
        (
            item["email"]
            for item in payload
            if isinstance(item, dict)
            and isinstance(item.get("email"), str)
            and bool(item.get("verified"))
            and bool(item.get("primary"))
        ),
        None,
    )
    if isinstance(primary_verified, str) and primary_verified.strip():
        return normalize_email(primary_verified)

    verified = next(
        (
            item["email"]
            for item in payload
            if isinstance(item, dict)
            and isinstance(item.get("email"), str)
            and bool(item.get("verified"))
        ),
        None,
    )
    if isinstance(verified, str) and verified.strip():
        return normalize_email(verified)

    raise OAuthFlowError("GitHub account does not expose a verified email address")


def _fetch_google_identity(*, token_payload: dict[str, Any]) -> OAuthIdentity:
    access_token = token_payload.get("access_token")
    if not isinstance(access_token, str) or not access_token:
        raise OAuthFlowError("Google did not return an access token")

    response = httpx.get(
        "https://openidconnect.googleapis.com/v1/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=OAUTH_TIMEOUT_SECONDS,
    )
    try:
        payload = response.json()
    except json.JSONDecodeError as exc:
        raise OAuthFlowError("Google returned an invalid profile response") from exc

    if response.status_code >= 400 or not isinstance(payload, dict):
        raise OAuthFlowError("Google profile lookup failed")

    email = payload.get("email")
    provider_user_id = payload.get("sub")
    if not isinstance(email, str) or not email.strip():
        raise OAuthFlowError("Google did not return an email address")
    if not isinstance(provider_user_id, str) or not provider_user_id.strip():
        raise OAuthFlowError("Google profile response was incomplete")
    if not bool(payload.get("email_verified")):
        raise OAuthFlowError("Google account email is not verified")

    name = payload.get("name") if isinstance(payload.get("name"), str) else None
    return OAuthIdentity(
        provider="google",
        provider_user_id=provider_user_id,
        email=normalize_email(email),
        name=name,
        email_verified=True,
    )


def _fetch_microsoft_identity(*, token_payload: dict[str, Any]) -> OAuthIdentity:
    raw_id_token = token_payload.get("id_token")
    if not isinstance(raw_id_token, str) or not raw_id_token:
        raise OAuthFlowError("Microsoft did not return an ID token")

    claims = _decode_jwt_payload(raw_id_token)
    provider_user_id = claims.get("sub") or claims.get("oid")
    email = claims.get("email") or claims.get("preferred_username")
    if not isinstance(provider_user_id, str) or not provider_user_id.strip():
        raise OAuthFlowError("Microsoft profile response was incomplete")
    if not isinstance(email, str) or not email.strip():
        raise OAuthFlowError("Microsoft account does not expose an email address")

    name = claims.get("name") if isinstance(claims.get("name"), str) else None
    return OAuthIdentity(
        provider="microsoft",
        provider_user_id=provider_user_id,
        email=normalize_email(email),
        name=name,
        email_verified=True,
    )


def _decode_jwt_payload(token: str) -> dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3:
        raise OAuthFlowError("Identity token payload was malformed")

    payload = parts[1]
    padding = "=" * (-len(payload) % 4)
    try:
        raw = base64.urlsafe_b64decode(f"{payload}{padding}".encode("ascii"))
        decoded = json.loads(raw.decode("utf-8"))
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise OAuthFlowError("Identity token payload was malformed") from exc

    if not isinstance(decoded, dict):
        raise OAuthFlowError("Identity token payload was malformed")
    return decoded


def _resolve_user_for_identity(db: Session, *, identity: OAuthIdentity) -> User:
    existing_identity = db.scalar(
        select(UserIdentity).where(
            UserIdentity.provider == identity.provider,
            UserIdentity.provider_user_id == identity.provider_user_id,
        )
    )
    if isinstance(existing_identity, UserIdentity):
        user = db.scalar(select(User).where(User.user_id == existing_identity.user_id))
        if isinstance(user, User):
            _sync_identity(db, existing_identity=existing_identity, identity=identity, user=user)
            _ensure_workspace_for_user(db, user=user)
            return user

    existing_user = db.scalar(select(User).where(User.email == identity.email))
    if isinstance(existing_user, User):
        _attach_identity(db, user=existing_user, identity=identity)
        _ensure_workspace_for_user(db, user=existing_user)
        return existing_user

    user = User(
        user_id=uuid4(),
        email=identity.email,
        name=(identity.name or _default_display_name(identity.email)).strip()
        or _default_display_name(identity.email),
        password_hash=None,
    )
    db.add(user)
    db.flush()
    bootstrap_workspace_for_user(
        db,
        user=user,
        project_name=None,
        pricing_tier=DEFAULT_PRICING_TIER,
    )
    _attach_identity(db, user=user, identity=identity)
    return user


def _sync_identity(
    db: Session,
    *,
    existing_identity: UserIdentity,
    identity: OAuthIdentity,
    user: User,
) -> None:
    changed = False
    normalized_email = normalize_email(identity.email)
    if existing_identity.email != normalized_email:
        existing_identity.email = normalized_email
        changed = True
    if not user.name and identity.name:
        user.name = identity.name.strip()
        changed = True
    if changed:
        db.add_all([existing_identity, user])
        db.commit()


def _attach_identity(
    db: Session,
    *,
    user: User,
    identity: OAuthIdentity,
) -> None:
    db.add(
        UserIdentity(
            identity_id=uuid4(),
            user_id=user.user_id,
            provider=identity.provider,
            provider_user_id=identity.provider_user_id,
            email=normalize_email(identity.email),
        )
    )
    db.commit()


def _ensure_workspace_for_user(db: Session, *, user: User) -> None:
    membership = db.scalar(
        select(ProjectMembership).where(ProjectMembership.user_id == user.user_id)
    )
    if membership is None:
        bootstrap_workspace_for_user(
            db,
            user=user,
            project_name=None,
            pricing_tier=DEFAULT_PRICING_TIER,
        )


def _create_session_exchange(db: Session, *, session_payload: dict[str, Any]) -> str:
    token = secrets.token_urlsafe(32)
    db.add(
        AuthSessionExchange(
            exchange_token=token,
            session_payload=jsonable_encoder(session_payload),
            expires_at=datetime.now(UTC) + EXCHANGE_TTL,
        )
    )
    db.commit()
    return token


def _humanize_provider_error(error: str) -> str:
    lowered = error.strip().lower()
    if lowered == "access_denied":
        return "Sign-in was cancelled"
    return f"Identity provider returned: {error}"


def _provider_error_message(payload: Any, fallback: str) -> str:
    if isinstance(payload, dict):
        for key in ("error_description", "error", "message"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value
    return fallback
