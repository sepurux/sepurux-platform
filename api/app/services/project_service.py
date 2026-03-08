from __future__ import annotations

from uuid import UUID, uuid4

from app.models import Project
from app.services.mutation_pack_service import ensure_system_mutation_packs
from sqlalchemy import select
from sqlalchemy.orm import Session


def create_project(db: Session, *, tenant_id: UUID, name: str) -> Project:
    project = Project(project_id=uuid4(), tenant_id=tenant_id, name=name)
    db.add(project)
    db.commit()
    ensure_system_mutation_packs(db, project_id=project.project_id)
    db.refresh(project)
    return project


def list_projects_for_tenant(db: Session, *, tenant_id: UUID) -> list[Project]:
    stmt = (
        select(Project)
        .where(Project.tenant_id == tenant_id)
        .order_by(Project.created_at.desc(), Project.project_id.desc())
    )
    return list(db.scalars(stmt))
