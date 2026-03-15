from __future__ import annotations

import redis
from redis import Redis
from rq import Queue

from app.config import get_settings

DEFAULT_RUN_QUEUE_NAME = "sepurux"
PRIORITY_RUN_QUEUE_NAME = "sepurux-priority"


def get_redis_connection() -> Redis:
    settings = get_settings()
    return redis.from_url(settings.redis_url)


def get_run_queue(*, priority: str = "normal") -> Queue:
    queue_name = PRIORITY_RUN_QUEUE_NAME if priority == "priority" else DEFAULT_RUN_QUEUE_NAME
    return Queue(queue_name, connection=get_redis_connection())
