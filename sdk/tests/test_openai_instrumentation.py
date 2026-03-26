"""Tests for OpenAI auto-instrumentation.

These tests exercise the instrumentation layer directly using stub objects,
so ``openai`` is NOT required to run them.
"""

from __future__ import annotations

import json
from unittest.mock import MagicMock

import httpx
import pytest

from sepurux import SepuruxClient
from sepurux.integrations.openai import InstrumentedOpenAI, instrument_openai


# ---------------------------------------------------------------------------
# Stub OpenAI response objects
# ---------------------------------------------------------------------------


class _FakeFunction:
    def __init__(self, name: str, arguments: str) -> None:
        self.name = name
        self.arguments = arguments


class _FakeToolCall:
    def __init__(self, id: str, function: _FakeFunction) -> None:
        self.id = id
        self.function = function


class _FakeMessage:
    def __init__(self, content: str | None = None, tool_calls: list | None = None) -> None:
        self.content = content
        self.role = "assistant"
        self.tool_calls = tool_calls or []


class _FakeChoice:
    def __init__(self, message: _FakeMessage, finish_reason: str = "stop") -> None:
        self.message = message
        self.finish_reason = finish_reason


class _FakeResponse:
    def __init__(self, choices: list[_FakeChoice]) -> None:
        self.id = "chatcmpl-test"
        self.model = "gpt-4o"
        self.choices = choices


def _text_response(text: str) -> _FakeResponse:
    return _FakeResponse([_FakeChoice(_FakeMessage(content=text))])


def _tool_response(tool_name: str, args: dict) -> _FakeResponse:
    tc = _FakeToolCall(
        id="call_abc",
        function=_FakeFunction(tool_name, json.dumps(args)),
    )
    return _FakeResponse(
        [_FakeChoice(_FakeMessage(tool_calls=[tc]), finish_reason="tool_calls")]
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


class _RequestCapture:
    def __init__(self) -> None:
        self.requests: list[httpx.Request] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if request.url.path == "/v1/traces":
            return httpx.Response(200, json={"trace_id": "trace-openai"})
        if request.url.path == "/v1/runs":
            return httpx.Response(200, json={"run_id": "run-openai"})
        return httpx.Response(200, json={})


def _make_sepurux_client() -> tuple[SepuruxClient, _RequestCapture]:
    capture = _RequestCapture()
    client = SepuruxClient(base_url="http://localhost:8000", api_key="k", project_id="p")
    client._client = httpx.Client(
        base_url=client.base_url,
        transport=httpx.MockTransport(capture),
        timeout=30,
        headers={"Accept": "application/json", "X-Sepurux-SDK": client.sdk_header},
    )
    return client, capture


def _make_fake_openai(response: _FakeResponse) -> MagicMock:
    """Build a fake openai.OpenAI client whose .chat.completions.create returns response."""
    fake = MagicMock()
    fake.chat.completions.create.return_value = response
    return fake


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_instrument_openai_returns_wrapper() -> None:
    fake_openai = _make_fake_openai(_text_response("ok"))
    sep_client, _ = _make_sepurux_client()
    with sep_client.trace("test_task", {}) as trace:
        ai = instrument_openai(fake_openai, recorder=trace)
    assert isinstance(ai, InstrumentedOpenAI)


def test_text_response_records_llm_call() -> None:
    fake_openai = _make_fake_openai(_text_response("Refund approved"))
    sep_client, capture = _make_sepurux_client()

    with sep_client.trace("refund_flow", {"ticket": "t-1"}) as trace:
        ai = instrument_openai(fake_openai, recorder=trace)
        ai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": "Process refund"}],
        )

    uploaded = json.loads(capture.requests[0].content.decode())
    event_types = [e["type"] for e in uploaded["events"]]
    assert "llm_call" in event_types

    llm = next(e for e in uploaded["events"] if e["type"] == "llm_call")
    assert llm["name"] == "gpt-4o"
    assert llm["status"] == "success"
    assert llm["latency_ms"] is not None


def test_tool_response_records_tool_calls() -> None:
    fake_openai = _make_fake_openai(
        _tool_response("payments.refund", {"payment_id": "pay_123", "amount": 4200})
    )
    sep_client, capture = _make_sepurux_client()

    with sep_client.trace("refund_flow", {}) as trace:
        ai = instrument_openai(fake_openai, recorder=trace)
        ai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": "Refund pay_123"}],
        )

    uploaded = json.loads(capture.requests[0].content.decode())
    event_types = [e["type"] for e in uploaded["events"]]
    assert "llm_call" in event_types
    assert "tool_call" in event_types

    tool_event = next(e for e in uploaded["events"] if e["type"] == "tool_call")
    assert tool_event["tool"] == "payments.refund"
    assert tool_event["args"]["amount"] == 4200


def test_api_error_records_failure_event() -> None:
    fake_openai = MagicMock()
    fake_openai.chat.completions.create.side_effect = RuntimeError("rate limit exceeded")

    sep_client, capture = _make_sepurux_client()

    with sep_client.trace("refund_flow", {}) as trace:
        ai = instrument_openai(fake_openai, recorder=trace)
        with pytest.raises(RuntimeError, match="rate limit exceeded"):
            ai.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": "test"}],
            )

    uploaded = json.loads(capture.requests[0].content.decode())
    failure_events = [e for e in uploaded["events"] if e["type"] == "failure"]
    assert len(failure_events) == 1
    assert "rate limit exceeded" in failure_events[0]["error"]["message"]


def test_unknown_attributes_delegate_to_wrapped_client() -> None:
    fake_openai = MagicMock()
    fake_openai.models.list.return_value = ["gpt-4o"]

    sep_client, _ = _make_sepurux_client()
    with sep_client.trace("task", {}) as trace:
        ai = instrument_openai(fake_openai, recorder=trace)
        result = ai.models.list()

    assert result == ["gpt-4o"]


def test_latency_is_positive_integer() -> None:
    fake_openai = _make_fake_openai(_text_response("ok"))
    sep_client, capture = _make_sepurux_client()

    with sep_client.trace("task", {}) as trace:
        ai = instrument_openai(fake_openai, recorder=trace)
        ai.chat.completions.create(model="gpt-4o", messages=[])

    uploaded = json.loads(capture.requests[0].content.decode())
    llm = next(e for e in uploaded["events"] if e["type"] == "llm_call")
    assert isinstance(llm["latency_ms"], int)
    assert llm["latency_ms"] >= 0
