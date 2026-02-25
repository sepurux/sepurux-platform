from __future__ import annotations

import json
from typing import Any

import boto3

from .config import get_settings

MAX_JSON_OBJECT_BYTES = 1_000_000


def get_s3_client():
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
    )


def put_json_object(key: str, payload: Any) -> None:
    settings = get_settings()
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    get_s3_client().put_object(
        Bucket=settings.s3_bucket,
        Key=key,
        Body=body,
        ContentType="application/json",
    )


class JsonObjectTooLargeError(Exception):
    pass


def get_json_object(key: str, *, max_bytes: int = MAX_JSON_OBJECT_BYTES) -> Any:
    settings = get_settings()
    client = get_s3_client()
    head = client.head_object(Bucket=settings.s3_bucket, Key=key)
    content_length = int(head.get("ContentLength") or 0)
    if content_length > max_bytes:
        raise JsonObjectTooLargeError(f"Object exceeds size limit ({content_length} > {max_bytes})")
    response = client.get_object(Bucket=settings.s3_bucket, Key=key)
    body = response["Body"].read(max_bytes + 1)
    if len(body) > max_bytes:
        raise JsonObjectTooLargeError(f"Object exceeds size limit ({len(body)} > {max_bytes})")
    return json.loads(body.decode("utf-8"))
