from __future__ import annotations

from uuid import UUID, uuid4

from app.models import ToolRegistry
from sqlalchemy import select
from sqlalchemy.orm import Session


class ToolRegistryNotFoundError(Exception):
    pass


def create_or_update_tool_registry_entry(
    db: Session,
    *,
    project_id: UUID,
    name: str,
    zone: str,
) -> ToolRegistry:
    existing = db.scalar(
        select(ToolRegistry).where(
            ToolRegistry.project_id == project_id,
            ToolRegistry.name == name,
        )
    )
    if existing is not None:
        existing.zone = zone
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    record = ToolRegistry(
        tool_id=uuid4(),
        project_id=project_id,
        name=name,
        zone=zone,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_tool_registry_entries(db: Session, *, project_id: UUID) -> list[ToolRegistry]:
    stmt = (
        select(ToolRegistry)
        .where(ToolRegistry.project_id == project_id)
        .order_by(ToolRegistry.created_at.desc(), ToolRegistry.tool_id.desc())
    )
    return list(db.scalars(stmt))


def get_tool_registry_entry(
    db: Session,
    *,
    project_id: UUID,
    tool_id: UUID,
) -> ToolRegistry | None:
    return db.scalar(
        select(ToolRegistry).where(
            ToolRegistry.project_id == project_id,
            ToolRegistry.tool_id == tool_id,
        )
    )


def update_tool_registry_zone(
    db: Session,
    *,
    project_id: UUID,
    tool_id: UUID,
    zone: str,
) -> ToolRegistry:
    record = get_tool_registry_entry(
        db,
        project_id=project_id,
        tool_id=tool_id,
    )
    if record is None:
        raise ToolRegistryNotFoundError("Tool registry entry not found")

    record.zone = zone
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


__all__ = [
    "ToolRegistryNotFoundError",
    "create_or_update_tool_registry_entry",
    "get_tool_registry_entry",
    "list_tool_registry_entries",
    "update_tool_registry_zone",
]
