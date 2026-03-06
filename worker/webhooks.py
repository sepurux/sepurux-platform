from __future__ import annotations

import hashlib
import hmac
import json
import time
from collections.abc import Callable, Sequence
from typing import Any

import httpx


def serialize_webhook_payload(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")


def generate_webhook_signature(secret: str, payload_bytes: bytes) -> str:
    digest = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def send_signed_webhook(
    *,
    url: str,
    secret: str,
    payload: dict[str, Any],
    timeout_seconds: float = 5.0,
    attempts: int = 3,
    backoff_seconds: Sequence[float] = (0.5, 1.0, 2.0),
    post_fn: Callable[..., httpx.Response] | None = None,
    sleep_fn: Callable[[float], None] | None = None,
) -> tuple[bool, str | None]:
    if attempts < 1:
        attempts = 1
    post = post_fn if post_fn is not None else httpx.post
    sleep = sleep_fn if sleep_fn is not None else time.sleep

    body = serialize_webhook_payload(payload)
    headers = {
        "Content-Type": "application/json",
        "X-CrashLab-Signature": generate_webhook_signature(secret, body),
    }

    last_error: str | None = None
    for attempt_index in range(attempts):
        try:
            response = post(url, content=body, headers=headers, timeout=timeout_seconds)
        except Exception as exc:  # pragma: no cover - exercised via tests with synthetic exceptions
            last_error = str(exc)
        else:
            if 200 <= response.status_code < 300:
                return True, None
            response_text = (response.text or "").strip()
            response_snippet = response_text[:280] if response_text else ""
            last_error = f"HTTP {response.status_code}"
            if response_snippet:
                last_error = f"{last_error}: {response_snippet}"

        if attempt_index < attempts - 1:
            backoff_index = min(attempt_index, len(backoff_seconds) - 1)
            sleep(max(backoff_seconds[backoff_index], 0.0))

    return False, (last_error or "webhook delivery failed")


def is_webhook_subscribed(events: object, event_type: str) -> bool:
    if not isinstance(events, list):
        return False
    subscriptions = [item for item in events if isinstance(item, str) and item]
    return event_type in subscriptions or "*" in subscriptions
