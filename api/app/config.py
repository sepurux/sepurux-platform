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
    mutation_pack_validation_mode: str

    @classmethod
    def from_env(cls) -> Settings:
        return cls(
            database_url=os.getenv(
                "DATABASE_URL",
                "postgresql+psycopg://crashlab:crashlab@localhost:5432/crashlab",
            ),
            redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
            s3_endpoint_url=os.getenv("S3_ENDPOINT_URL", "http://localhost:9000"),
            s3_access_key=os.getenv("S3_ACCESS_KEY", "minio"),
            s3_secret_key=os.getenv("S3_SECRET_KEY", "minio123456"),
            s3_bucket=os.getenv("S3_BUCKET", "sepurux"),
            s3_region=os.getenv("S3_REGION", "us-east-1"),
            mutation_pack_validation_mode=os.getenv("MUTATION_PACK_VALIDATION_MODE", "warn"),
        )


@lru_cache
def get_settings() -> Settings:
    return Settings.from_env()
