from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from app.models import Campaign, Run, Trace
from app.queue import get_run_queue
from sqlalchemy import select
from sqlalchemy.orm import Session


class RelatedRecordNotFoundError(Exception):
    pass


def create_run(db: Session, *, trace_id: UUID, campaign_id: UUID) -> Run:
    if db.get(Trace, trace_id) is None:
        raise RelatedRecordNotFoundError("Trace not found")
    if db.get(Campaign, campaign_id) is None:
        raise RelatedRecordNotFoundError("Campaign not found")

    run = Run(
        run_id=uuid4(),
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


def create_run_and_enqueue(db: Session, *, trace_id: UUID, campaign_id: UUID) -> Run:
    run = create_run(db=db, trace_id=trace_id, campaign_id=campaign_id)
    enqueue_execute_run(run)
    return run


def get_run(db: Session, run_id: UUID) -> Run | None:
    return db.get(Run, run_id)


def list_recent_runs(db: Session, *, limit: int = 20) -> list[Run]:
    stmt = select(Run).order_by(Run.created_at.desc(), Run.run_id.desc()).limit(limit)
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
