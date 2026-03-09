from __future__ import annotations

import json
from typing import Any

import boto3
from botocore.exceptions import ClientError

from .config import get_settings

MAX_JSON_OBJECT_BYTES = 1_000_000
_BUCKET_READY = False


def get_s3_client():
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
    )


def _bucket_create_kwargs(bucket: str, region: str) -> dict[str, Any]:
    kwargs: dict[str, Any] = {"Bucket": bucket}
    # S3-compatible APIs only need explicit location outside us-east-1.
    if region and region != "us-east-1":
        kwargs["CreateBucketConfiguration"] = {"LocationConstraint": region}
    return kwargs


def ensure_bucket_exists() -> None:
    global _BUCKET_READY
    if _BUCKET_READY:
        return

    settings = get_settings()
    client = get_s3_client()
    try:
        client.head_bucket(Bucket=settings.s3_bucket)
    except ClientError as exc:
        error_code = str(exc.response.get("Error", {}).get("Code", ""))
        if error_code not in {"404", "NoSuchBucket", "NotFound"}:
            raise
        client.create_bucket(**_bucket_create_kwargs(settings.s3_bucket, settings.s3_region))
    _BUCKET_READY = True


def put_json_object(key: str, payload: Any) -> None:
    settings = get_settings()
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    ensure_bucket_exists()
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
    ensure_bucket_exists()
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
