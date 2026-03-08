from __future__ import annotations

import httpx
from crashlab_sdk import CrashLabClient


class _RequestCapture:
    def __init__(self) -> None:
        self.requests: list[httpx.Request] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if request.url.path == "/v1/traces":
            return httpx.Response(201, json={"trace_id": "trace-123"})
        return httpx.Response(404, json={"detail": "not found"})


def test_upload_trace_uses_traces_endpoint_and_headers() -> None:
    capture = _RequestCapture()
    transport = httpx.MockTransport(capture)

    client = CrashLabClient(
        base_url="http://localhost:8000",
        api_key="key-1",
        project_id="project-1",
    )
    client._client = httpx.Client(
        base_url=client.base_url,
        transport=transport,
        timeout=30,
        headers={"Accept": "application/json", "X-CrashLab-SDK": client.sdk_header},
    )

    trace_id = client.upload_trace(
        {
            "trace_version": "0.1",
            "source": "sdk",
            "task": {"name": "task", "input": {}},
            "events": [],
        }
    )

    assert trace_id == "trace-123"
    assert len(capture.requests) == 1
    request = capture.requests[0]
    assert request.url.path == "/v1/traces"
    assert request.headers.get("X-API-Key") == "key-1"
    assert request.headers.get("X-Project-Id") == "project-1"
    assert request.headers.get("X-CrashLab-SDK", "").startswith("py/")


def test_upload_trace_uses_explicit_sdk_header_override() -> None:
    capture = _RequestCapture()
    transport = httpx.MockTransport(capture)

    client = CrashLabClient(
        base_url="http://localhost:8000",
        api_key="key-1",
        project_id="project-1",
        sdk_header="py/9.9.9",
    )
    client._client = httpx.Client(
        base_url=client.base_url,
        transport=transport,
        timeout=30,
        headers={"Accept": "application/json", "X-CrashLab-SDK": client.sdk_header},
    )

    trace_id = client.upload_trace(
        {
            "trace_version": "0.1",
            "source": "sdk",
            "task": {"name": "task", "input": {}},
            "events": [],
        }
    )

    assert trace_id == "trace-123"
    assert len(capture.requests) == 1
    request = capture.requests[0]
    assert request.headers.get("X-CrashLab-SDK") == "py/9.9.9"
