from __future__ import annotations

import redis
from rq_scheduler import Scheduler

from config import get_settings


def main() -> None:
    settings = get_settings()
    connection = redis.from_url(settings.redis_url)
    scheduler = Scheduler(queue_name="sepurux", connection=connection)

    # Clear any existing registration so we don't accumulate duplicates on restart
    for job in scheduler.get_jobs():
        if job.id == "dispatch_scheduled_campaigns":
            scheduler.cancel(job)

    scheduler.cron(
        "* * * * *",
        func="worker.dispatch_scheduled_campaigns",
        id="dispatch_scheduled_campaigns",
        use_local_timezone=False,
    )

    scheduler.run()


if __name__ == "__main__":
    main()
