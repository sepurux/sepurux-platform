from __future__ import annotations

from app.auth import hash_api_key
from app.models import ApiKey, Base, MutationPack, Project, ProjectMembership, Tenant, User
from app.mutation_registry import list_registered_pack_definitions
from app.scripts import seed_local_credentials
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


def test_seed_local_credentials_creates_role_specific_workspaces(monkeypatch) -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    monkeypatch.setattr(seed_local_credentials, "SessionLocal", testing_session_local)

    seed_local_credentials.main()

    with testing_session_local() as db:
        _assert_seeded_workspace(
            db,
            email="admin@sepurux.local",
            pricing_tier="enterprise",
            api_key="sepurux-admin-key",
        )
        _assert_seeded_workspace(
            db,
            email="developer@sepurux.local",
            pricing_tier="team",
            api_key="sepurux-developer-key",
        )
        _assert_seeded_workspace(
            db,
            email="viewer@sepurux.local",
            pricing_tier="starter",
            api_key="sepurux-viewer-key",
        )

    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def _assert_seeded_workspace(db: Session, *, email: str, pricing_tier: str, api_key: str) -> None:
    user = db.scalar(select(User).where(User.email == email))
    assert isinstance(user, User)
    assert user.password_hash is not None

    membership = db.scalar(
        select(ProjectMembership).where(ProjectMembership.user_id == user.user_id)
    )
    assert isinstance(membership, ProjectMembership)

    project = db.scalar(select(Project).where(Project.project_id == membership.project_id))
    assert isinstance(project, Project)

    api_key_record = db.scalar(select(ApiKey).where(ApiKey.key_hash == hash_api_key(api_key)))
    assert isinstance(api_key_record, ApiKey)
    assert api_key_record.user_id == user.user_id
    assert api_key_record.project_id == membership.project_id

    project_tenant = db.scalar(
        select(Tenant).join_from(Tenant, Project).where(Project.project_id == membership.project_id)
    )
    assert isinstance(project_tenant, Tenant)
    assert project.tenant_id == project_tenant.tenant_id
    assert project_tenant.pricing_tier == pricing_tier

    packs = list(
        db.scalars(
            select(MutationPack)
            .where(MutationPack.project_id == project.project_id)
            .order_by(MutationPack.name.asc())
        )
    )
    expected_names = sorted(
        str(definition["name"]) for definition in list_registered_pack_definitions()
    )
    assert [pack.name for pack in packs] == expected_names
    assert all(pack.is_system for pack in packs)
