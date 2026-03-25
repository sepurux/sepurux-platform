from __future__ import annotations

import json

import httpx
import pytest
from sepurux import SepuruxClient, configure, record_trace, trace, traceable


class _RequestCapture:
    def __init__(self) -> None:
        self.requests: list[httpx.Request] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if request.url.path == "/v1/traces":
            if request.method == "GET":
                return httpx.Response(
                    200,
                    json=[
                        {
                            "trace_id": "trace-123",
                            "source": "sdk",
                            "trace_version": "0.2",
                            "task_name": "customer_support_agent",
                            "validation_status": "valid",
                            "s3_key": "traces/trace-123.json",
                            "created_at": "2026-03-14T00:00:00Z",
                        }
                    ],
                )
            return httpx.Response(201, json={"trace_id": "trace-123"})
        if request.url.path == "/v1/traces/trace-123/bootstrap":
            return httpx.Response(
                200,
                json={
                    "trace_id": "trace-123",
                    "tools_discovered": ["search_docs", "create_ticket", "send_slack"],
                    "tool_zones_created": 3,
                    "tool_zones_updated": 0,
                    "policy_pack_id": "policy-pack-123",
                    "policy_pack_name": "trace.bootstrap.default",
                    "policy_pack_created": True,
                    "campaigns": [
                        {
                            "campaign_id": "campaign-a",
                            "name": "Bootstrap · Tool Chaos",
                            "mutation_pack_id": "pack-a",
                            "mutation_pack_name": "tool-chaos",
                            "created": True,
                        }
                    ],
                },
            )
        if request.url.path == "/v1/traces/trace-123":
            return httpx.Response(
                200,
                json={
                    "trace_id": "trace-123",
                    "source": "sdk",
                    "trace_version": "0.2",
                    "task_name": "customer_support_agent",
                    "validation_status": "valid",
                    "s3_key": "traces/trace-123.json",
                    "payload": (
                        {"events": []} if request.url.params.get("include_payload") else None
                    ),
                    "created_at": "2026-03-14T00:00:00Z",
                },
            )
        if request.url.path == "/v1/traces/trace-123/timeline":
            return httpx.Response(
                200,
                json=[
                    {
                        "id": "step-1",
                        "trace_id": "trace-123",
                        "step_type": "prompt",
                        "step_name": "customer_support_agent",
                        "status": "success",
                        "input_payload": {"prompt": "Find the balance"},
                        "output_payload": None,
                        "latency_ms": 0,
                        "started_at": "2026-03-14T00:00:00Z",
                        "finished_at": "2026-03-14T00:00:00Z",
                        "metadata": {"source": "trace_upload"},
                    }
                ],
            )
        if request.url.path == "/v1/campaigns":
            if request.method == "GET":
                return httpx.Response(
                    200, json=[{"campaign_id": "campaign-123", "name": "demo_campaign"}]
                )
            return httpx.Response(201, json={"campaign_id": "campaign-created"})
        if request.url.path == "/v1/runs":
            return httpx.Response(201, json={"run_id": "run-456"})
        if request.url.path == "/v1/runs/run-456":
            return httpx.Response(
                200,
                json={"run_id": "run-456", "status": "completed", "summary": {"attempt_count": 5}},
            )
        if request.url.path == "/v1/runs/run-123":
            return httpx.Response(
                200,
                json={"run_id": "run-123", "status": "completed", "summary": {"attempt_count": 5}},
            )
        if request.url.path == "/v1/ci/runs/run-ci-123":
            return httpx.Response(
                200,
                json={
                    "run_id": "run-ci-123",
                    "status": "done",
                    "decision": "pass",
                    "pass_rate": 0.95,
                    "unsafe_attempts": 0,
                    "failures": 1,
                    "top_failing_tools": [{"tool": "payments.refund", "count": 1}],
                    "mutation_categories": ["schema", "fault", "latency"],
                    "mutation_coverage_score": 60,
                    "dashboard_url": "https://app.sepurux.com/runs/run-ci-123",
                },
            )
        if request.url.path == "/v1/campaigns/campaign-123/run-pack":
            return httpx.Response(201, json={"run_id": "run-123"})
        if request.url.path == "/v1/campaigns/campaign-123/reliability":
            return httpx.Response(
                200,
                json={
                    "reliability_score": 82.0,
                    "status": "warning",
                    "classified_failures": 2,
                    "failure_breakdown": [{"type": "tool_timeout", "count": 1}],
                },
            )
        if request.url.path == "/v1/campaigns/campaign-123/failures":
            return httpx.Response(
                200,
                json=[
                    {
                        "failure_id": "failure-1",
                        "run_id": request.url.params.get("run_id") or "run-123",
                        "campaign_id": "campaign-123",
                        "trace_id": "trace-123",
                        "mutation": "core.reliability",
                        "type": "tool_timeout",
                        "severity": "high",
                        "description": "timeout",
                        "metadata": {"tool": "jira.create_issue"},
                        "created_at": "2026-03-12T00:00:00Z",
                    }
                ],
            )
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


def test_trace_catalog_methods_use_trace_endpoints() -> None:
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

    traces = client.list_traces()
    trace = client.get_trace("trace-123", include_payload=True)
    timeline = client.get_trace_timeline("trace-123")

    assert traces[0]["task_name"] == "customer_support_agent"
    assert trace["payload"] == {"events": []}
    assert timeline[0]["step_type"] == "prompt"
    assert [request.url.path for request in capture.requests] == [
        "/v1/traces",
        "/v1/traces/trace-123",
        "/v1/traces/trace-123/timeline",
    ]


def test_bootstrap_trace_calls_trace_bootstrap_endpoint() -> None:
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

    payload = client.bootstrap_trace("trace-123")

    assert payload["trace_id"] == "trace-123"
    assert payload["policy_pack_name"] == "trace.bootstrap.default"
    assert payload["tools_discovered"] == ["search_docs", "create_ticket", "send_slack"]
    assert payload["campaigns"][0]["name"] == "Bootstrap · Tool Chaos"
    assert [request.url.path for request in capture.requests] == ["/v1/traces/trace-123/bootstrap"]


def test_get_ci_run_returns_mutation_coverage_fields() -> None:
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

    ci_status = client.get_ci_run("run-ci-123")

    assert ci_status["run_id"] == "run-ci-123"
    assert ci_status["decision"] == "pass"
    assert ci_status["mutation_categories"] == ["schema", "fault", "latency"]
    assert ci_status["mutation_coverage_score"] == 60
    assert ci_status["dashboard_url"] == "https://app.sepurux.com/runs/run-ci-123"
    assert [request.url.path for request in capture.requests] == ["/v1/ci/runs/run-ci-123"]


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


def test_from_env_reads_standard_sdk_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SEPURUX_API_BASE_URL", "https://example.test")
    monkeypatch.setenv("SEPURUX_API_KEY", "env-key")
    monkeypatch.setenv("SEPURUX_PROJECT_ID", "env-project")

    client = SepuruxClient.from_env()

    assert client.base_url == "https://example.test"
    assert client.api_key == "env-key"
    assert client.project_id == "env-project"


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


def test_run_pack_uses_campaign_run_pack_endpoint() -> None:
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

    run_id = client.run_pack(campaign_id="campaign-123", mutation_pack="core.reliability")

    assert run_id == "run-123"
    request = capture.requests[0]
    assert request.url.path == "/v1/campaigns/campaign-123/run-pack"
    assert request.headers.get("X-API-Key") == "key-1"
    assert request.headers.get("X-Project-Id") == "project-1"


def test_trace_context_auto_uploads_and_starts_run() -> None:
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

    with client.trace("demo_trace", {"foo": "bar"}, campaign_id="demo_campaign") as trace_recorder:
        trace_recorder.model_step("plan", {"goal": "test"})

    assert trace_recorder.trace_id == "trace-123"
    assert trace_recorder.run_id == "run-456"
    assert [request.url.path for request in capture.requests] == [
        "/v1/traces",
        "/v1/campaigns",
        "/v1/runs",
    ]
    uploaded_trace = json.loads(capture.requests[0].content.decode())
    assert uploaded_trace["events"][0]["type"] == "prompt"
    assert uploaded_trace["events"][1]["type"] == "model"


def test_traceable_decorator_records_and_uploads() -> None:
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

    @client.traceable(campaign_id="demo_campaign")
    def multiply(x: int, y: int) -> int:
        return x * y

    assert multiply(3, 4) == 12
    assert [request.url.path for request in capture.requests] == [
        "/v1/traces",
        "/v1/campaigns",
        "/v1/runs",
    ]
    uploaded_trace = json.loads(capture.requests[0].content.decode())
    assert uploaded_trace["events"][0]["type"] == "prompt"
    assert uploaded_trace["events"][-1]["type"] == "agent_output"


def test_global_configure_and_traceable_use_default_client() -> None:
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
    configure(client=client)

    @traceable()
    def classify(text: str) -> dict[str, str]:
        return {"label": text}

    assert classify("bug") == {"label": "bug"}

    with trace("support_case", {"channel": "email"}) as recorder:
        recorder.model_step("classify", {"label": "bug"})

    assert capture.requests[-1].url.path == "/v1/traces"


def test_run_campaign_prefers_server_side_run_pack_when_requested() -> None:
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

    result = client.run_campaign("demo_campaign", mutation_pack="core.reliability")

    assert result["run_id"] == "run-123"
    assert result["reliability_score"] == 82.0
    assert result["reliability_status"] == "warning"
    assert result["failures"][0]["type"] == "tool_timeout"
    assert [request.url.path for request in capture.requests] == [
        "/v1/campaigns",
        "/v1/campaigns/campaign-123/run-pack",
        "/v1/runs/run-123",
        "/v1/campaigns/campaign-123/reliability",
        "/v1/campaigns/campaign-123/failures",
    ]


def test_run_campaign_can_return_partial_result_without_waiting() -> None:
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

    result = client.run_campaign("demo_campaign", wait_for_completion=False)

    assert result["status"] == "queued"
    assert result["reliability_score"] is None
    assert result["failures"] == []
    assert [request.url.path for request in capture.requests] == [
        "/v1/campaigns",
        "/v1/traces",
        "/v1/runs",
    ]


def test_record_trace_warns_and_preserves_return_value() -> None:
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

    with pytest.warns(DeprecationWarning, match="traceable"):

        @record_trace(client=client, campaign_id="demo_campaign")
        def multiply(x: int, y: int) -> int:
            return x * y

    assert multiply(2, 5) == 10
    assert [request.url.path for request in capture.requests] == [
        "/v1/traces",
        "/v1/campaigns",
        "/v1/runs",
    ]


def test_start_run_ci_fallback_includes_github_context_from_env(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path == "/v1/runs":
            return httpx.Response(404, json={"detail": "not found"})
        if request.url.path == "/v1/ci/runs":
            return httpx.Response(201, json={"run_id": "run-ci-123"})
        return httpx.Response(404, json={"detail": "not found"})

    monkeypatch.setenv("GITHUB_REPO", "sepurux/sepurux-platform")
    monkeypatch.setenv("PR_NUMBER", "97")

    client = SepuruxClient(
        base_url="http://localhost:8000",
        api_key="key-1",
        project_id="project-1",
    )
    client._client = httpx.Client(
        base_url=client.base_url,
        transport=httpx.MockTransport(handler),
        timeout=30,
        headers={"Accept": "application/json", "X-Sepurux-SDK": client.sdk_header},
    )

    run_id = client.start_run(trace_id="trace-123", campaign_id="campaign-123")

    assert run_id == "run-ci-123"
    assert [request.url.path for request in requests] == ["/v1/runs", "/v1/ci/runs"]
    ci_payload = json.loads(requests[1].content.decode())
    assert ci_payload["repo"] == "sepurux/sepurux-platform"
    assert ci_payload["pull_request_number"] == 97


def test_preflight_run_inputs_calls_trace_and_campaign_endpoints() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path == "/v1/traces/trace-123":
            return httpx.Response(200, json={"trace_id": "trace-123"})
        if request.url.path == "/v1/campaigns/campaign-123":
            return httpx.Response(200, json={"campaign_id": "campaign-123"})
        return httpx.Response(404, json={"detail": "not found"})

    client = SepuruxClient(
        base_url="http://localhost:8000",
        api_key="key-1",
        project_id="project-1",
    )
    client._client = httpx.Client(
        base_url=client.base_url,
        transport=httpx.MockTransport(handler),
        timeout=30,
        headers={"Accept": "application/json", "X-Sepurux-SDK": client.sdk_header},
    )

    client.preflight_run_inputs(trace_id="trace-123", campaign_id="campaign-123")

    assert [request.url.path for request in requests] == [
        "/v1/traces/trace-123",
        "/v1/campaigns/campaign-123",
    ]


def test_preflight_run_inputs_raises_clear_error_when_campaign_is_missing() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/v1/traces/trace-123":
            return httpx.Response(200, json={"trace_id": "trace-123"})
        if request.url.path == "/v1/campaigns/campaign-404":
            return httpx.Response(404, json={"detail": "Campaign not found"})
        return httpx.Response(404, json={"detail": "not found"})

    client = SepuruxClient(
        base_url="http://localhost:8000",
        api_key="key-1",
        project_id="project-1",
    )
    client._client = httpx.Client(
        base_url=client.base_url,
        transport=httpx.MockTransport(handler),
        timeout=30,
        headers={"Accept": "application/json", "X-Sepurux-SDK": client.sdk_header},
    )

    with pytest.raises(ValueError, match="Campaign not found: campaign-404"):
        client.preflight_run_inputs(trace_id="trace-123", campaign_id="campaign-404")


def test_start_run_with_preflight_validates_resources_first() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path == "/v1/traces/trace-123":
            return httpx.Response(200, json={"trace_id": "trace-123"})
        if request.url.path == "/v1/campaigns/campaign-123":
            return httpx.Response(200, json={"campaign_id": "campaign-123"})
        if request.url.path == "/v1/runs":
            return httpx.Response(201, json={"run_id": "run-789"})
        return httpx.Response(404, json={"detail": "not found"})

    client = SepuruxClient(
        base_url="http://localhost:8000",
        api_key="key-1",
        project_id="project-1",
    )
    client._client = httpx.Client(
        base_url=client.base_url,
        transport=httpx.MockTransport(handler),
        timeout=30,
        headers={"Accept": "application/json", "X-Sepurux-SDK": client.sdk_header},
    )

    run_id = client.start_run(trace_id="trace-123", campaign_id="campaign-123", preflight=True)

    assert run_id == "run-789"
    assert [request.url.path for request in requests] == [
        "/v1/traces/trace-123",
        "/v1/campaigns/campaign-123",
        "/v1/runs",
    ]
