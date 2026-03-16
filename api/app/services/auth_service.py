from __future__ import annotations

import binascii
import hashlib
import hmac
from typing import Literal
from uuid import UUID, uuid4

from app.auth import ROLE_RANKS, TenantAuthContext
from app.models import Project, ProjectMembership, Role, Tenant, User
from app.services.api_key_service import create_api_key_for_tenant
from app.services.billing_service import get_billing_snapshot_for_context
from app.services.mutation_pack_service import ensure_system_mutation_packs
from app.services.pricing_service import (
    DEFAULT_PRICING_TIER,
    build_auth_permissions,
    normalize_pricing_tier,
)
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

ROLE_ADMIN_ID = UUID("10000000-0000-0000-0000-000000000001")
ROLE_DEVELOPER_ID = UUID("10000000-0000-0000-0000-000000000002")
ROLE_VIEWER_ID = UUID("10000000-0000-0000-0000-000000000003")
ROLE_IDS: dict[str, UUID] = {
    "admin": ROLE_ADMIN_ID,
    "developer": ROLE_DEVELOPER_ID,
    "viewer": ROLE_VIEWER_ID,
}

SESSION_KEY_NAME_PREFIX = "web-session:"
PASSWORD_SCHEME = "pbkdf2_sha256"
PASSWORD_ITERATIONS = 600_000
PASSWORD_SALT_BYTES = 16


def normalize_email(value: str) -> str:
    return value.strip().lower()


def hash_password(password: str) -> str:
    salt = hashlib.sha256(uuid4().bytes).digest()[:PASSWORD_SALT_BYTES]
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_ITERATIONS,
    )
    return (
        f"{PASSWORD_SCHEME}${PASSWORD_ITERATIONS}$"
        f"{binascii.hexlify(salt).decode('ascii')}$"
        f"{binascii.hexlify(derived).decode('ascii')}"
    )


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        scheme, iterations_raw, salt_hex, hash_hex = password_hash.split("$", 3)
    except ValueError:
        return False

    if scheme != PASSWORD_SCHEME:
        return False

    try:
        iterations = int(iterations_raw)
        salt = binascii.unhexlify(salt_hex.encode("ascii"))
        expected = binascii.unhexlify(hash_hex.encode("ascii"))
    except (ValueError, binascii.Error):
        return False

    candidate = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )
    return hmac.compare_digest(candidate, expected)


def signup_user(
    db: Session,
    *,
    email: str,
    password: str,
    name: str | None,
    project_name: str | None,
    pricing_tier: str | None,
) -> dict[str, object]:
    normalized_email = normalize_email(email)
    if not normalized_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is required")

    existing = db.scalar(select(User).where(User.email == normalized_email))
    if isinstance(existing, User):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    display_name = _normalize_name(name) or _default_display_name(normalized_email)
    user = User(
        user_id=uuid4(),
        email=normalized_email,
        name=display_name,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.flush()
    bootstrap_workspace_for_user(
        db,
        user=user,
        project_name=project_name,
        pricing_tier=pricing_tier,
    )
    return issue_session_for_user(db, user=user, is_demo=False)


def login_user(db: Session, *, email: str, password: str) -> dict[str, object]:
    normalized_email = normalize_email(email)
    user = db.scalar(select(User).where(User.email == normalized_email))
    if not isinstance(user, User) or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return issue_session_for_user(db, user=user, is_demo=False)


def session_metadata(
    db: Session,
    *,
    tenant_auth: TenantAuthContext,
    project_id: UUID,
) -> dict[str, object]:
    project = db.scalar(select(Project).where(Project.project_id == project_id))
    if not isinstance(project, Project):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    tenant = db.scalar(select(Tenant).where(Tenant.tenant_id == project.tenant_id))
    pricing_tier = (
        "enterprise"
        if tenant_auth.is_demo
        else normalize_pricing_tier(
            tenant.pricing_tier if isinstance(tenant, Tenant) else DEFAULT_PRICING_TIER
        )
    )

    user = None
    if tenant_auth.user_id is not None:
        user = db.scalar(select(User).where(User.user_id == tenant_auth.user_id))

    display_name = tenant_auth.api_key_name or "Workspace Session"
    email = None
    if isinstance(user, User):
        display_name = user.name or _default_display_name(user.email)
        email = user.email

    billing_snapshot = get_billing_snapshot_for_context(
        db,
        tenant_auth=tenant_auth,
        project_id=project.project_id,
        pricing_tier=pricing_tier,
    )
    wallet = billing_snapshot["wallet"] if isinstance(billing_snapshot, dict) else None
    subscription = billing_snapshot["subscription"] if isinstance(billing_snapshot, dict) else None

    billing_plan_name = subscription.get("plan_name") if isinstance(subscription, dict) else None
    resolved_plan_name = billing_plan_name or "Credits"

    return {
        "tenant_id": tenant_auth.tenant_id,
        "project_id": project.project_id,
        "project_name": project.name,
        "project_scoped": tenant_auth.project_id is not None,
        "pricing_tier": "credits",
        "plan_name": resolved_plan_name,
        "role_name": "member",
        "user_id": tenant_auth.user_id,
        "email": email,
        "name": display_name,
        "is_demo": tenant_auth.is_demo,
        "billing_plan_name": billing_plan_name,
        "credits_balance": wallet.get("balance") if isinstance(wallet, dict) else None,
        "monthly_credits": wallet.get("monthly_credits") if isinstance(wallet, dict) else None,
        "topup_credits": wallet.get("topup_credits") if isinstance(wallet, dict) else None,
        "queue_priority": wallet.get("queue_priority") if isinstance(wallet, dict) else None,
        "low_credit_threshold": (
            wallet.get("low_credit_threshold") if isinstance(wallet, dict) else None
        ),
        "is_low_credit": bool(wallet.get("is_low_credit")) if isinstance(wallet, dict) else False,
        "permissions": build_auth_permissions(tenant_auth.role_name, pricing_tier).model_dump(),
    }


def _issue_session(
    db: Session,
    *,
    user: User,
    project: Project,
    role_name: Literal["admin", "developer", "viewer"] | str,
    is_demo: bool,
) -> dict[str, object]:
    api_key_name = f"{SESSION_KEY_NAME_PREFIX}{uuid4().hex[:12]}"
    _, plaintext = create_api_key_for_tenant(
        db,
        tenant_id=project.tenant_id,
        project_id=project.project_id,
        user_id=user.user_id,
        name=api_key_name,
        is_demo=is_demo,
        rate_limit_per_minute=240,
    )
    payload = session_metadata(
        db,
        tenant_auth=TenantAuthContext(
            tenant_id=project.tenant_id,
            api_key_id=uuid4(),
            api_key_name=api_key_name,
            project_id=project.project_id,
            user_id=user.user_id,
            role_name=_normalize_role_name(role_name),
            is_demo=is_demo,
            rate_limit_per_minute=240,
        ),
        project_id=project.project_id,
    )
    payload["api_key"] = plaintext
    return payload


def issue_session_for_user(
    db: Session,
    *,
    user: User,
    is_demo: bool,
) -> dict[str, object]:
    project, role_name = get_primary_project_for_user(db, user=user)
    return _issue_session(
        db,
        user=user,
        project=project,
        role_name=role_name,
        is_demo=is_demo,
    )


def get_primary_project_for_user(
    db: Session,
    *,
    user: User,
) -> tuple[Project, str]:
    membership = db.scalar(
        select(ProjectMembership)
        .where(ProjectMembership.user_id == user.user_id)
        .order_by(ProjectMembership.created_at.asc(), ProjectMembership.project_id.asc())
    )
    if not isinstance(membership, ProjectMembership):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is not assigned to any project",
        )

    project = db.scalar(select(Project).where(Project.project_id == membership.project_id))
    if not isinstance(project, Project):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assigned project not found",
        )

    role = db.scalar(select(Role).where(Role.role_id == membership.role_id))
    role_name = role.name if isinstance(role, Role) and role.name in ROLE_RANKS else "viewer"
    return project, role_name


def bootstrap_workspace_for_user(
    db: Session,
    *,
    user: User,
    project_name: str | None,
    pricing_tier: str | None,
) -> Project:
    display_name = _normalize_name(user.name) or _default_display_name(user.email)
    workspace_name = f"{display_name} Workspace"
    resolved_project_name = (project_name or "").strip() or f"{display_name} Project"
    resolved_pricing_tier = normalize_pricing_tier(pricing_tier or DEFAULT_PRICING_TIER)

    tenant = Tenant(tenant_id=uuid4(), name=workspace_name, pricing_tier=resolved_pricing_tier)
    project = Project(
        project_id=uuid4(),
        tenant_id=tenant.tenant_id,
        owner_id=user.user_id,
        name=resolved_project_name,
    )
    admin_role = _get_or_create_role(db, "admin")
    membership = ProjectMembership(
        user_id=user.user_id,
        project_id=project.project_id,
        role_id=admin_role.role_id,
    )

    db.add(tenant)
    db.flush()
    db.add_all([project, membership])
    db.commit()
    ensure_system_mutation_packs(db, project_id=project.project_id)
    return project


def _get_or_create_role(db: Session, name: Literal["admin", "developer", "viewer"]) -> Role:
    existing = db.scalar(select(Role).where(Role.name == name))
    if isinstance(existing, Role):
        return existing

    role = Role(role_id=ROLE_IDS[name], name=name)
    db.add(role)
    db.flush()
    return role


def _normalize_name(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip()
    return normalized or None


def _default_display_name(email: str) -> str:
    local_part = email.split("@", 1)[0].replace(".", " ").replace("_", " ").strip()
    if not local_part:
        return "Sepurux User"
    return " ".join(segment.capitalize() for segment in local_part.split())


def _normalize_role_name(value: str) -> Literal["admin", "developer", "viewer"]:
    if value == "admin":
        return "admin"
    if value == "developer":
        return "developer"
    return "viewer"
