from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

from policy_engine import PolicyDecision

_OPA_DECISION_PATH = "/v1/data/sepurux/policy/decision"
_MAX_ATTEMPTS = 2


class OPAUnavailableError(RuntimeError):
    pass


class OPAResponseError(RuntimeError):
    pass


@dataclass(frozen=True)
class OPAEvaluation:
    decision: PolicyDecision
    reason: str


def evaluate_policy_with_opa(
    *,
    policy_input: dict[str, Any],
    opa_url: str,
    timeout_seconds: float,
) -> OPAEvaluation:
    endpoint = f"{opa_url.rstrip('/')}{_OPA_DECISION_PATH}"
    payload = {"input": policy_input}

    for attempt in range(_MAX_ATTEMPTS):
        try:
            response = httpx.post(endpoint, json=payload, timeout=timeout_seconds)
        except httpx.HTTPError as exc:
            if attempt < _MAX_ATTEMPTS - 1:
                continue
            raise OPAUnavailableError(f"OPA request failed after retry: {exc}") from exc

        if response.status_code >= 500:
            if attempt < _MAX_ATTEMPTS - 1:
                continue
            raise OPAUnavailableError(f"OPA returned status {response.status_code} after retry")

        if response.status_code >= 400:
            raise OPAResponseError(f"OPA rejected request with status {response.status_code}")

        try:
            response_payload = response.json()
        except ValueError as exc:
            raise OPAResponseError("OPA returned non-JSON response") from exc

        return parse_opa_decision_response(response_payload)

    raise OPAUnavailableError("OPA evaluation failed")


def parse_opa_decision_response(payload: Any) -> OPAEvaluation:
    if not isinstance(payload, dict):
        raise OPAResponseError("OPA response payload must be an object")

    result = payload.get("result")
    if not isinstance(result, dict):
        raise OPAResponseError("OPA response missing 'result' object")

    decision_payload: dict[str, Any] | None = None
    if isinstance(result.get("decision"), str):
        decision_payload = result
    else:
        nested = result.get("decision")
        if isinstance(nested, dict):
            decision_payload = nested

    if decision_payload is None:
        raise OPAResponseError("OPA decision payload is missing")

    decision = decision_payload.get("decision")
    if decision not in {"allow", "deny", "require_approval"}:
        raise OPAResponseError("OPA decision must be one of allow, deny, require_approval")

    reason = decision_payload.get("reason")
    if not isinstance(reason, str) or not reason.strip():
        reason = f"OPA returned decision '{decision}'"

    return OPAEvaluation(decision=decision, reason=reason.strip())
