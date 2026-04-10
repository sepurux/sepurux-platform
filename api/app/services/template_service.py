from __future__ import annotations

from uuid import UUID, uuid4

from app.models import HardeningTemplate, Run, RunTemplateLink
from app.services.run_service import create_run, enqueue_execute_run
from sqlalchemy import select
from sqlalchemy.orm import Session


class TemplateNotFoundError(Exception):
    pass


class RunNotFoundError(Exception):
    pass


def create_template(
    db: Session,
    *,
    project_id: UUID,
    name: str,
    template_type: str,
    config: object,
) -> HardeningTemplate:
    record = HardeningTemplate(
        template_id=uuid4(),
        project_id=project_id,
        name=name,
        type=template_type,
        config=config,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_templates(db: Session, *, project_id: UUID) -> list[HardeningTemplate]:
    stmt = (
        select(HardeningTemplate)
        .where(HardeningTemplate.project_id == project_id)
        .order_by(HardeningTemplate.created_at.desc(), HardeningTemplate.template_id.desc())
    )
    return list(db.scalars(stmt))


def get_template(db: Session, *, project_id: UUID, template_id: UUID) -> HardeningTemplate | None:
    stmt = select(HardeningTemplate).where(
        HardeningTemplate.project_id == project_id,
        HardeningTemplate.template_id == template_id,
    )
    return db.scalar(stmt)


def list_template_links_for_run(db: Session, *, run_id: UUID) -> list[RunTemplateLink]:
    stmt = select(RunTemplateLink).where(RunTemplateLink.run_id == run_id)
    return list(db.scalars(stmt))


def apply_template_and_enqueue(
    db: Session,
    *,
    project_id: UUID,
    run_id: UUID,
    template_id: UUID,
    queue_priority: str = "normal",
    actor: str | None = None,
) -> Run:
    source_run = db.scalar(
        select(Run).where(
            Run.run_id == run_id,
            Run.project_id == project_id,
        )
    )
    if source_run is None:
        raise RunNotFoundError("Run not found")

    template = get_template(db, project_id=project_id, template_id=template_id)
    if template is None:
        raise TemplateNotFoundError("Template not found")

    new_run = create_run(
        db,
        project_id=project_id,
        trace_id=source_run.trace_id,
        campaign_id=source_run.campaign_id,
        mutation_pack_id=source_run.mutation_pack_id,
        policy_pack_id=source_run.policy_pack_id,
        actor=actor,
    )

    existing_template_ids = {
        link.template_id for link in list_template_links_for_run(db, run_id=source_run.run_id)
    }
    existing_template_ids.add(template.template_id)

    for linked_template_id in sorted(existing_template_ids, key=str):
        db.add(
            RunTemplateLink(
                run_id=new_run.run_id,
                template_id=linked_template_id,
            )
        )

    summary = dict(new_run.summary) if isinstance(new_run.summary, dict) else {}
    source_summary = dict(source_run.summary) if isinstance(source_run.summary, dict) else {}
    for key in ("resolved_mutation_set", "replay_seed_basis", "trace_hardening"):
        if key in source_summary:
            summary[key] = source_summary[key]
    summary["template_application"] = {
        "source_run_id": str(source_run.run_id),
        "trigger_template_id": str(template.template_id),
        "applied_template_ids": [str(item) for item in sorted(existing_template_ids, key=str)],
    }
    new_run.summary = summary
    db.add(new_run)
    db.commit()

    enqueue_execute_run(new_run, queue_priority=queue_priority)
    return new_run


__all__ = [
    "RunNotFoundError",
    "TemplateNotFoundError",
    "apply_template_and_enqueue",
    "create_template",
    "get_template",
    "list_template_links_for_run",
    "list_templates",
]
