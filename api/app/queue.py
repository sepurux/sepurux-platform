from __future__ import annotations

import redis
from redis import Redis
from rq import Queue

from app.config import get_settings


def get_redis_connection() -> Redis:
    settings = get_settings()
    return redis.from_url(settings.redis_url)


def get_run_queue() -> Queue:
    return Queue("sepurux", connection=get_redis_connection())
