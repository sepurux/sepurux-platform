"""Tests for SepuruxCallbackHandler.

These tests exercise the handler directly by calling callback methods with
stub objects, so langchain-core is NOT required to run them.
"""

from __future__ import annotations

import json
import types
import uuid
from typing import Any
from unittest.mock import MagicMock, patch

import httpx
import pytest


# ---------------------------------------------------------------------------
# Stub LangChain types so we don't need langchain-core installed
# ---------------------------------------------------------------------------

class _StubBaseCallbackHandler:
    pass


class _StubGeneration:
    def __init__(self, text: str) -> None:
        self.text = text


class _StubLLMResult:
    def __init__(self, text: str) -> None:
        self.generations = [[_StubGeneration(text)]]


class _StubAgentFinish:
    def __init__(self, return_values: dict[str, Any]) -> None:
        self.return_values = return_values
        self.log = ""


# Patch langchain_core before importing the handler
import sys

_langchain_core_mock = types.ModuleType("langchain_core")
_callbacks_mock = types.ModuleType("langchain_core.callbacks")
_callbacks_mock.BaseCallbackHandler = _StubBaseCallbackHandler  # type: ignore[attr-defined]
_langchain_core_mock.callbacks = _callbacks_mock  # type: ignore[attr-defined]
sys.modules.setdefault("langchain_core", _langchain_core_mock)
sys.modules.setdefault("langchain_core.callbacks", _callbacks_mock)

from sepurux import SepuruxClient  # noqa: E402
from sepurux.integrations.langchain import SepuruxCallbackHandler  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class _RequestCapture:
    def __init__(self) -> None:
        self.requests: list[httpx.Request] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if request.url.path == "/v1/traces":
            return httpx.Response(200, json={"trace_id": "trace-abc"})
        if request.url.path.startswith("/v1/campaigns"):
            return httpx.Response(200, json=[{"campaign_id": "camp-1", "name": "demo_campaign"}])
        if request.url.path == "/v1/runs":
            return httpx.Response(200, json={"run_id": "run-xyz"})
        return httpx.Response(200, json={})


def _make_client() -> tuple[SepuruxClient, _RequestCapture]:
    capture = _RequestCapture()
    client = SepuruxClient(base_url="http://localhost:8000", api_key="k", project_id="p")
    client._client = httpx.Client(
        base_url=client.base_url,
        transport=httpx.MockTransport(capture),
        timeout=30,
        headers={"Accept": "application/json", "X-Sepurux-SDK": client.sdk_header},
    )
    return client, capture


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_llm_start_end_records_llm_call() -> None:
    client, capture = _make_client()
    handler = SepuruxCallbackHandler("refund_flow", {"ticket": "t-1"}, client=client)

    run_id = uuid.uuid4()
    handler.on_llm_start(
        {"name": "gpt-4o"},
        ["classify this ticket"],
        run_id=run_id,
    )
    handler.on_llm_end(_StubLLMResult("low risk"), run_id=run_id)
    handler.finish()

    uploaded = json.loads(capture.requests[0].content.decode())
    event_types = [e["type"] for e in uploaded["events"]]
    assert "llm_call" in event_types

    llm_event = next(e for e in uploaded["events"] if e["type"] == "llm_call")
    assert llm_event["name"] == "gpt-4o"
    assert llm_event["status"] == "success"


def test_tool_start_end_records_tool_call_and_result() -> None:
    client, capture = _make_client()
    handler = SepuruxCallbackHandler("refund_flow", client=client)

    run_id = uuid.uuid4()
    handler.on_tool_start(
        {"name": "payments.refund"},
        '{"payment_id": "pay_123", "amount": 4200}',
        run_id=run_id,
    )
    handler.on_tool_end('{"refund_id": "rf_123", "status": "queued"}', run_id=run_id)
    handler.finish()

    uploaded = json.loads(capture.requests[0].content.decode())
    event_types = [e["type"] for e in uploaded["events"]]
    assert "tool_call" in event_types
    assert "tool_result" in event_types

    tool_call = next(e for e in uploaded["events"] if e["type"] == "tool_call")
    assert tool_call["tool"] == "payments.refund"

    tool_result = next(e for e in uploaded["events"] if e["type"] == "tool_result")
    assert tool_result["tool"] == "payments.refund"


def test_agent_finish_records_agent_output() -> None:
    client, capture = _make_client()
    handler = SepuruxCallbackHandler("refund_flow", client=client)

    handler.on_agent_finish(
        _StubAgentFinish({"output": "Refund approved"}),
        run_id=uuid.uuid4(),
    )
    handler.finish()

    uploaded = json.loads(capture.requests[0].content.decode())
    event_types = [e["type"] for e in uploaded["events"]]
    assert "agent_output" in event_types


def test_llm_error_records_failure_event() -> None:
    client, capture = _make_client()
    handler = SepuruxCallbackHandler("refund_flow", client=client)

    run_id = uuid.uuid4()
    handler.on_llm_start({"name": "gpt-4o"}, ["prompt"], run_id=run_id)
    handler.on_llm_error(ValueError("rate limit"), run_id=run_id)
    handler.finish()

    uploaded = json.loads(capture.requests[0].content.decode())
    failure_events = [e for e in uploaded["events"] if e["type"] == "failure"]
    assert len(failure_events) == 1
    assert "rate limit" in failure_events[0]["error"]["message"]


def test_finish_sets_trace_id_and_run_id() -> None:
    client, capture = _make_client()
    handler = SepuruxCallbackHandler(
        "refund_flow",
        campaign_id="demo_campaign",
        client=client,
    )
    handler.finish()

    assert handler.trace_id == "trace-abc"
    assert handler.run_id == "run-xyz"


def test_context_manager_calls_finish() -> None:
    client, capture = _make_client()

    with SepuruxCallbackHandler("refund_flow", client=client) as handler:
        run_id = uuid.uuid4()
        handler.on_llm_start({"name": "gpt-4o"}, ["prompt"], run_id=run_id)
        handler.on_llm_end(_StubLLMResult("ok"), run_id=run_id)

    # finish() was called on __exit__ so trace was uploaded
    assert len(capture.requests) == 1
    assert handler.trace_id == "trace-abc"


def test_tool_error_records_failure_and_clears_pending() -> None:
    client, capture = _make_client()
    handler = SepuruxCallbackHandler("refund_flow", client=client)

    run_id = uuid.uuid4()
    handler.on_tool_start({"name": "payments.refund"}, "{}", run_id=run_id)
    handler.on_tool_error(RuntimeError("timeout"), run_id=run_id)

    # Pending tool cleared
    assert str(run_id) not in handler._pending_tools

    handler.finish()
    uploaded = json.loads(capture.requests[0].content.decode())
    failure_events = [e for e in uploaded["events"] if e["type"] == "failure"]
    assert any("timeout" in e["error"]["message"] for e in failure_events)
