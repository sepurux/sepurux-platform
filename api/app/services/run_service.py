from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from app.models import Campaign, Run, Trace
from app.queue import get_run_queue
from sqlalchemy import select
from sqlalchemy.orm import Session


class RelatedRecordNotFoundError(Exception):
    pass


def create_run(db: Session, *, project_id: UUID, trace_id: UUID, campaign_id: UUID) -> Run:
    if (
        db.scalar(select(Trace).where(Trace.trace_id == trace_id, Trace.project_id == project_id))
        is None
    ):
        raise RelatedRecordNotFoundError("Trace not found")
    if (
        db.scalar(
            select(Campaign).where(
                Campaign.campaign_id == campaign_id,
                Campaign.project_id == project_id,
            )
        )
        is None
    ):
        raise RelatedRecordNotFoundError("Campaign not found")

    run = Run(
        run_id=uuid4(),
        project_id=project_id,
        trace_id=trace_id,
        campaign_id=campaign_id,
        status="queued",
        summary=None,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def enqueue_execute_run(run: Run) -> None:
    # Use a fully-qualified function path so RQ workers can import it reliably.
    get_run_queue().enqueue("worker.execute_run", str(run.run_id))


def create_run_and_enqueue(
    db: Session, *, project_id: UUID, trace_id: UUID, campaign_id: UUID
) -> Run:
    run = create_run(db=db, project_id=project_id, trace_id=trace_id, campaign_id=campaign_id)
    enqueue_execute_run(run)
    return run


def get_run(db: Session, *, project_id: UUID, run_id: UUID) -> Run | None:
    stmt = select(Run).where(Run.run_id == run_id, Run.project_id == project_id)
    return db.scalar(stmt)


def list_recent_runs(db: Session, *, project_id: UUID, limit: int = 20) -> list[Run]:
    stmt = (
        select(Run)
        .where(Run.project_id == project_id)
        .order_by(Run.created_at.desc(), Run.run_id.desc())
        .limit(limit)
    )
    return list(db.scalars(stmt))


def run_metadata(run: Run) -> dict[str, Any]:
    return {
        "run_id": run.run_id,
        "trace_id": run.trace_id,
        "campaign_id": run.campaign_id,
        "status": run.status,
        "summary": run.summary,
        "created_at": run.created_at,
    }
