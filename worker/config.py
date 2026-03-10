from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class Settings:
    database_url: str
    redis_url: str
    s3_endpoint_url: str
    s3_access_key: str
    s3_secret_key: str
    s3_bucket: str
    s3_region: str
    opa_url: str
    opa_timeout_seconds: float

    @classmethod
    def from_env(cls) -> Settings:
        return cls(
            database_url=_database_url_from_env(),
            redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
            s3_endpoint_url=_first_env("S3_ENDPOINT_URL", "AWS_ENDPOINT_URL_S3")
            or "http://localhost:9000",
            s3_access_key=_first_env("S3_ACCESS_KEY", "AWS_ACCESS_KEY_ID") or "minio",
            s3_secret_key=_first_env("S3_SECRET_KEY", "AWS_SECRET_ACCESS_KEY") or "minio123456",
            s3_bucket=_first_env("S3_BUCKET", "BUCKET_NAME") or "sepurux",
            s3_region=_first_env("S3_REGION", "AWS_REGION") or "us-east-1",
            opa_url=os.getenv("OPA_URL", "http://opa:8181"),
            opa_timeout_seconds=_env_float("OPA_TIMEOUT_SECONDS", default=2.0),
        )


@lru_cache
def get_settings() -> Settings:
    return Settings.from_env()


def _env_float(name: str, *, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _first_env(*names: str) -> str | None:
    for name in names:
        value = os.getenv(name)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _database_url_from_env() -> str:
    raw = _first_env("DATABASE_URL", "POSTGRES_URL")
    if raw is None:
        return "postgresql+psycopg://crashlab:crashlab@localhost:5432/crashlab"
    return _normalize_database_url(raw)


def _normalize_database_url(url: str) -> str:
    if url.startswith("postgresql+"):
        return url
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url.removeprefix("postgres://")
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url.removeprefix("postgresql://")
    return url
