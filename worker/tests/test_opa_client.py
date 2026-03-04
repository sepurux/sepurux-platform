from __future__ import annotations

import httpx
import pytest

from policy.opa_client import (
    OPAResponseError,
    OPAUnavailableError,
    evaluate_policy_with_opa,
    parse_opa_decision_response,
)


class _FakeResponse:
    def __init__(self, status_code: int, payload: object) -> None:
        self.status_code = status_code
        self._payload = payload

    def json(self) -> object:
        return self._payload


def test_parse_opa_decision_response_accepts_direct_decision_object() -> None:
    evaluation = parse_opa_decision_response(
        {
            "result": {
                "decision": "allow",
                "reason": "safe tool call",
            }
        }
    )

    assert evaluation.decision == "allow"
    assert evaluation.reason == "safe tool call"


def test_parse_opa_decision_response_accepts_nested_decision_object() -> None:
    evaluation = parse_opa_decision_response(
        {
            "result": {
                "decision": {
                    "decision": "require_approval",
                    "reason": "requires explicit approval token",
                }
            }
        }
    )

    assert evaluation.decision == "require_approval"
    assert "approval token" in evaluation.reason


def test_parse_opa_decision_response_rejects_invalid_decision() -> None:
    with pytest.raises(OPAResponseError):
        parse_opa_decision_response({"result": {"decision": "maybe"}})


def test_evaluate_policy_with_opa_retries_once_then_succeeds(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = {"count": 0}

    def fake_post(url: str, *, json: object, timeout: float) -> _FakeResponse:
        assert url == "http://opa:8181/v1/data/crashlab/policy/decision"
        assert isinstance(json, dict)
        assert timeout == 1.5
        calls["count"] += 1
        if calls["count"] == 1:
            raise httpx.ConnectError(
                "temporary outage",
                request=httpx.Request("POST", url),
            )
        return _FakeResponse(
            200,
            {
                "result": {
                    "decision": "deny",
                    "reason": "blocked by OPA policy",
                }
            },
        )

    monkeypatch.setattr("policy.opa_client.httpx.post", fake_post)

    evaluation = evaluate_policy_with_opa(
        policy_input={"tool": {"name": "payments.refund", "args": {}}},
        opa_url="http://opa:8181",
        timeout_seconds=1.5,
    )

    assert calls["count"] == 2
    assert evaluation.decision == "deny"
    assert evaluation.reason == "blocked by OPA policy"


def test_evaluate_policy_with_opa_raises_unavailable_after_retry(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def always_fail(url: str, *, json: object, timeout: float) -> _FakeResponse:
        raise httpx.ConnectError(
            "unreachable",
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr("policy.opa_client.httpx.post", always_fail)

    with pytest.raises(OPAUnavailableError):
        evaluate_policy_with_opa(
            policy_input={"tool": {"name": "payments.refund", "args": {}}},
            opa_url="http://opa:8181",
            timeout_seconds=1.0,
        )
