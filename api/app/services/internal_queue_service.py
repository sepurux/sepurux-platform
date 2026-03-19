from __future__ import annotations

from typing import Literal

from app.queue import DEFAULT_RUN_QUEUE_NAME, PRIORITY_RUN_QUEUE_NAME, get_redis_connection
from app.schemas import InternalQueueActionResponse, InternalQueueJobEntry, InternalQueueOverview
from redis import Redis
from rq import Queue, Worker
from rq.job import Job
from rq.registry import FailedJobRegistry, StartedJobRegistry


def _queue_bundle() -> tuple[Redis, Queue, Queue]:
    redis_connection = get_redis_connection()
    default_queue = Queue(DEFAULT_RUN_QUEUE_NAME, connection=redis_connection)
    priority_queue = Queue(PRIORITY_RUN_QUEUE_NAME, connection=redis_connection)
    return redis_connection, default_queue, priority_queue


def _job_entry(job: Job, *, queue_name: str) -> InternalQueueJobEntry:
    return InternalQueueJobEntry(
        job_id=job.id,
        status=job.get_status(refresh=False),
        queue=queue_name,
        description=job.description,
        enqueued_at=job.enqueued_at,
        started_at=getattr(job, "started_at", None),
        ended_at=getattr(job, "ended_at", None),
    )


def _fetch_jobs(redis_connection: Redis, job_ids: list[str], *, limit: int) -> list[Job]:
    jobs: list[Job] = []
    for job_id in job_ids[:limit]:
        try:
            jobs.append(Job.fetch(job_id, connection=redis_connection))
        except Exception:
            continue
    return jobs


def get_internal_queue_overview(*, limit: int = 50) -> InternalQueueOverview:
    try:
        redis_connection, default_queue, priority_queue = _queue_bundle()

        default_started = StartedJobRegistry(DEFAULT_RUN_QUEUE_NAME, connection=redis_connection)
        priority_started = StartedJobRegistry(PRIORITY_RUN_QUEUE_NAME, connection=redis_connection)
        running_ids = default_started.get_job_ids() + priority_started.get_job_ids()

        default_failed = FailedJobRegistry(DEFAULT_RUN_QUEUE_NAME, connection=redis_connection)
        priority_failed = FailedJobRegistry(PRIORITY_RUN_QUEUE_NAME, connection=redis_connection)
        failed_ids = default_failed.get_job_ids() + priority_failed.get_job_ids()

        running_jobs = _fetch_jobs(redis_connection, running_ids, limit=limit)
        failed_jobs = _fetch_jobs(redis_connection, failed_ids, limit=limit)

        worker_count = len(Worker.all(connection=redis_connection))
        worker_status: Literal["online", "offline", "unknown"] = (
            "online" if worker_count > 0 else "offline"
        )

        queue_backlog = int(default_queue.count) + int(priority_queue.count)
        return InternalQueueOverview(
            jobs_running=len(running_ids),
            jobs_failed=len(failed_ids),
            queue_backlog=queue_backlog,
            worker_status=worker_status,
            running_jobs=[
                _job_entry(job, queue_name=job.origin or DEFAULT_RUN_QUEUE_NAME)
                for job in running_jobs
            ],
            failed_jobs=[
                _job_entry(job, queue_name=job.origin or DEFAULT_RUN_QUEUE_NAME)
                for job in failed_jobs
            ],
        )
    except Exception:
        return InternalQueueOverview(
            jobs_running=0,
            jobs_failed=0,
            queue_backlog=0,
            worker_status="unknown",
            running_jobs=[],
            failed_jobs=[],
        )


def retry_queue_job(job_id: str) -> InternalQueueActionResponse:
    try:
        redis_connection, _default_queue, _priority_queue = _queue_bundle()
        job = Job.fetch(job_id, connection=redis_connection)
        job.requeue()
        return InternalQueueActionResponse(
            job_id=job_id,
            action="retry",
            success=True,
            detail="Job requeued",
        )
    except Exception as exc:
        return InternalQueueActionResponse(
            job_id=job_id,
            action="retry",
            success=False,
            detail=str(exc),
        )


def cancel_queue_job(job_id: str) -> InternalQueueActionResponse:
    try:
        redis_connection, _default_queue, _priority_queue = _queue_bundle()
        job = Job.fetch(job_id, connection=redis_connection)
        job.cancel()
        return InternalQueueActionResponse(
            job_id=job_id,
            action="cancel",
            success=True,
            detail="Job canceled",
        )
    except Exception as exc:
        return InternalQueueActionResponse(
            job_id=job_id,
            action="cancel",
            success=False,
            detail=str(exc),
        )
