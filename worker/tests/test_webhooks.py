from __future__ import annotations

import hashlib
import hmac
from typing import Any

import httpx

from webhooks import generate_webhook_signature, send_signed_webhook, serialize_webhook_payload


def test_generate_webhook_signature_matches_hmac_sha256() -> None:
    payload = {"event_type": "run.completed", "project_id": "p-1", "data": {"run_id": "r-1"}}
    body = serialize_webhook_payload(payload)
    secret = "whsec_super_secret"

    expected = (
        "sha256="
        + hmac.new(
            secret.encode("utf-8"),
            body,
            hashlib.sha256,
        ).hexdigest()
    )
    assert generate_webhook_signature(secret, body) == expected


def test_send_signed_webhook_retries_and_succeeds() -> None:
    attempts: list[dict[str, Any]] = []
    responses = [500, 204]

    def fake_post(
        url: str, *, content: bytes, headers: dict[str, str], timeout: float
    ) -> httpx.Response:
        attempts.append(
            {
                "url": url,
                "content": content,
                "headers": headers,
                "timeout": timeout,
            }
        )
        code = responses.pop(0)
        return httpx.Response(code, text="temporary failure" if code >= 400 else "ok")

    sleeps: list[float] = []

    success, error = send_signed_webhook(
        url="https://example.com/hook",
        secret="whsec_retry",
        payload={"event_type": "run.completed", "project_id": "p-1", "data": {"run_id": "r-1"}},
        attempts=3,
        backoff_seconds=(0.01, 0.01, 0.01),
        post_fn=fake_post,
        sleep_fn=lambda value: sleeps.append(value),
    )

    assert success is True
    assert error is None
    assert len(attempts) == 2
    assert sleeps == [0.01]
