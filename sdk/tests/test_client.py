from __future__ import annotations

import httpx
import pytest
from sepurux import SepuruxClient


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

    client = SepuruxClient(
        base_url="http://localhost:8000",
        api_key="key-1",
        project_id="project-1",
    )
    client._client = httpx.Client(
        base_url=client.base_url,
        transport=transport,
        timeout=30,
        headers={"Accept": "application/json", "X-Sepurux-SDK": client.sdk_header},
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
    assert request.headers.get("X-Sepurux-SDK", "").startswith("py/")


def test_upload_trace_uses_explicit_sdk_header_override() -> None:
    capture = _RequestCapture()
    transport = httpx.MockTransport(capture)

    client = SepuruxClient(
        base_url="http://localhost:8000",
        api_key="key-1",
        project_id="project-1",
        sdk_header="py/9.9.9",
    )
    client._client = httpx.Client(
        base_url=client.base_url,
        transport=transport,
        timeout=30,
        headers={"Accept": "application/json", "X-Sepurux-SDK": client.sdk_header},
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
    assert request.headers.get("X-Sepurux-SDK") == "py/9.9.9"


def test_demo_mode_warns() -> None:
    with pytest.warns(UserWarning, match="limited demo environment"):
        SepuruxClient(
            base_url="http://localhost:8000",
            api_key="demo_sepurux_key",
            project_id="project-1",
        )


def test_get_demo_info_calls_public_endpoint() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path == "/demo/info":
            return httpx.Response(200, json={"demo_api_key": "demo_sepurux_key"})
        return httpx.Response(404, json={"detail": "not found"})

    client = SepuruxClient(base_url="http://localhost:8000")
    client._client = httpx.Client(base_url=client.base_url, transport=httpx.MockTransport(handler))

    payload = client.get_demo_info()
    assert payload["demo_api_key"] == "demo_sepurux_key"
    assert requests[0].url.path == "/demo/info"
