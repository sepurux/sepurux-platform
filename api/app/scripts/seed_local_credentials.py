from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import hash_api_key
from app.db import SessionLocal
from app.models import ApiKey, Project, ProjectMembership, Role, Tenant, User
from app.services.auth_service import (
    ROLE_ADMIN_ID,
    ROLE_DEVELOPER_ID,
    ROLE_VIEWER_ID,
)


@dataclass(frozen=True)
class SeededWorkspace:
    label: str
    tenant_id: UUID
    project_id: UUID
    user_id: UUID
    api_key_id: UUID
    role_id: UUID
    role_name: str
    pricing_tier: str
    tenant_name: str
    project_name: str
    user_name: str
    email: str
    password_hash: str
    password_plaintext: str
    api_key_name: str
    api_key_plaintext: str


SEEDED_WORKSPACES = [
    SeededWorkspace(
        label="admin",
        tenant_id=UUID("a1111111-1111-1111-1111-111111111111"),
        project_id=UUID("a2222222-2222-2222-2222-222222222222"),
        user_id=UUID("a3333333-3333-3333-3333-333333333333"),
        api_key_id=UUID("a4444444-4444-4444-4444-444444444444"),
        role_id=ROLE_ADMIN_ID,
        role_name="admin",
        pricing_tier="enterprise",
        tenant_name="Sepurux Admin Workspace",
        project_name="Enterprise Control Plane",
        user_name="Admin User",
        email="admin@sepurux.local",
        password_hash=(
            "pbkdf2_sha256$600000$00112233445566778899aabbccddeeff$"
            "b1fd06ef6639c87640a1235b39ba5d4c0c8cd904b4e661d945a34fb7eca52923"
        ),
        password_plaintext="AdminPass123!",
        api_key_name="local-admin",
        api_key_plaintext="sepurux-admin-key",
    ),
    SeededWorkspace(
        label="developer",
        tenant_id=UUID("b1111111-1111-1111-1111-111111111111"),
        project_id=UUID("b2222222-2222-2222-2222-222222222222"),
        user_id=UUID("b3333333-3333-3333-3333-333333333333"),
        api_key_id=UUID("b4444444-4444-4444-4444-444444444444"),
        role_id=ROLE_DEVELOPER_ID,
        role_name="developer",
        pricing_tier="team",
        tenant_name="Sepurux Developer Workspace",
        project_name="Team Delivery Sandbox",
        user_name="Developer User",
        email="developer@sepurux.local",
        password_hash=(
            "pbkdf2_sha256$600000$11223344556677889900aabbccddeeff$"
            "6aac48146e6313c89c34cdbe25b06e54d80d2859e1eeeb0c018e7c1a311052c5"
        ),
        password_plaintext="DeveloperPass123!",
        api_key_name="local-developer",
        api_key_plaintext="sepurux-developer-key",
    ),
    SeededWorkspace(
        label="viewer",
        tenant_id=UUID("c1111111-1111-1111-1111-111111111111"),
        project_id=UUID("c2222222-2222-2222-2222-222222222222"),
        user_id=UUID("c3333333-3333-3333-3333-333333333333"),
        api_key_id=UUID("c4444444-4444-4444-4444-444444444444"),
        role_id=ROLE_VIEWER_ID,
        role_name="viewer",
        pricing_tier="starter",
        tenant_name="Sepurux Viewer Workspace",
        project_name="Starter Read Only Sandbox",
        user_name="Viewer User",
        email="viewer@sepurux.local",
        password_hash=(
            "pbkdf2_sha256$600000$2233445566778899aabbccddeeff0011$"
            "7efe14905aea306973d209230a21d9cf723ced2e999769cd5e59ba1bdb63323d"
        ),
        password_plaintext="ViewerPass123!",
        api_key_name="local-viewer",
        api_key_plaintext="sepurux-viewer-key",
    ),
]


def main() -> None:
    with SessionLocal() as db:
        _ensure_roles(db)
        db.commit()
        for workspace in SEEDED_WORKSPACES:
            _upsert_workspace(db, workspace)

    print("Seeded local login credentials:")
    for workspace in SEEDED_WORKSPACES:
        print(
            "  "
            + f"{workspace.label}: role={workspace.role_name} "
            + f"plan={workspace.pricing_tier} "
            + f"email={workspace.email} "
            + f"password={workspace.password_plaintext} "
            + f"api_key={workspace.api_key_plaintext} "
            + f"project_id={workspace.project_id}"
        )


def _ensure_roles(db: Session) -> None:
    for role_id, role_name in (
        (ROLE_ADMIN_ID, "admin"),
        (ROLE_DEVELOPER_ID, "developer"),
        (ROLE_VIEWER_ID, "viewer"),
    ):
        record = db.scalar(select(Role).where(Role.role_id == role_id))
        if isinstance(record, Role):
            if record.name != role_name:
                record.name = role_name
                db.add(record)
            continue

        by_name = db.scalar(select(Role).where(Role.name == role_name))
        if isinstance(by_name, Role):
            if by_name.role_id != role_id:
                by_name.role_id = role_id
                db.add(by_name)
            continue

        db.add(Role(role_id=role_id, name=role_name))


def _upsert_workspace(db: Session, workspace: SeededWorkspace) -> None:
    tenant = db.scalar(select(Tenant).where(Tenant.tenant_id == workspace.tenant_id))
    if isinstance(tenant, Tenant):
        tenant.name = workspace.tenant_name
        tenant.pricing_tier = workspace.pricing_tier
    else:
        tenant = Tenant(
            tenant_id=workspace.tenant_id,
            name=workspace.tenant_name,
            pricing_tier=workspace.pricing_tier,
        )
        db.add(tenant)
    db.commit()

    user = db.scalar(select(User).where(User.user_id == workspace.user_id))
    if isinstance(user, User):
        user.email = workspace.email
        user.name = workspace.user_name
        user.password_hash = workspace.password_hash
    else:
        user = User(
            user_id=workspace.user_id,
            email=workspace.email,
            name=workspace.user_name,
            password_hash=workspace.password_hash,
        )
        db.add(user)
    db.commit()

    project = db.scalar(select(Project).where(Project.project_id == workspace.project_id))
    if isinstance(project, Project):
        project.tenant_id = workspace.tenant_id
        project.owner_id = workspace.user_id
        project.name = workspace.project_name
    else:
        project = Project(
            project_id=workspace.project_id,
            tenant_id=workspace.tenant_id,
            owner_id=workspace.user_id,
            name=workspace.project_name,
        )
        db.add(project)
    db.commit()

    membership = db.scalar(
        select(ProjectMembership).where(
            ProjectMembership.user_id == workspace.user_id,
            ProjectMembership.project_id == workspace.project_id,
        )
    )
    if isinstance(membership, ProjectMembership):
        membership.role_id = workspace.role_id
        db.add(membership)
    else:
        db.add(
            ProjectMembership(
                user_id=workspace.user_id,
                project_id=workspace.project_id,
                role_id=workspace.role_id,
            )
        )

    db.commit()

    api_key = db.scalar(select(ApiKey).where(ApiKey.api_key_id == workspace.api_key_id))
    if isinstance(api_key, ApiKey):
        api_key.tenant_id = workspace.tenant_id
        api_key.project_id = workspace.project_id
        api_key.user_id = workspace.user_id
        api_key.name = workspace.api_key_name
        api_key.key_hash = hash_api_key(workspace.api_key_plaintext)
        api_key.is_demo = False
        api_key.rate_limit_per_minute = 240
        db.add(api_key)
        db.commit()
        return

    existing_by_hash = db.scalar(
        select(ApiKey).where(ApiKey.key_hash == hash_api_key(workspace.api_key_plaintext))
    )
    if isinstance(existing_by_hash, ApiKey):
        existing_by_hash.api_key_id = workspace.api_key_id
        existing_by_hash.tenant_id = workspace.tenant_id
        existing_by_hash.project_id = workspace.project_id
        existing_by_hash.user_id = workspace.user_id
        existing_by_hash.name = workspace.api_key_name
        existing_by_hash.is_demo = False
        existing_by_hash.rate_limit_per_minute = 240
        db.add(existing_by_hash)
        db.commit()
        return

    db.add(
        ApiKey(
            api_key_id=workspace.api_key_id,
            tenant_id=workspace.tenant_id,
            project_id=workspace.project_id,
            user_id=workspace.user_id,
            name=workspace.api_key_name,
            key_hash=hash_api_key(workspace.api_key_plaintext),
            is_demo=False,
            rate_limit_per_minute=240,
        )
    )
    db.commit()


if __name__ == "__main__":
    main()
