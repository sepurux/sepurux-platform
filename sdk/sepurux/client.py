from __future__ import annotations

import warnings
from importlib.metadata import PackageNotFoundError, version
from typing import Any
from uuid import UUID

import httpx

from .types import RunStatus, TracePayload

SDK_PACKAGE_NAME = "sepurux"
DEMO_API_KEY = "demo_sepurux_key"


class SepuruxClient:
    def __init__(
        self,
        base_url: str,
        api_key: str | None = None,
        project_id: str | None = None,
        timeout: float = 30,
        sdk_header: str | None = None,
        demo_mode: bool = False,
    ) -> None:
        normalized = base_url.strip().rstrip("/")
        if not normalized:
            raise ValueError("base_url must be a non-empty URL")

        self.base_url = normalized
        self.api_key = api_key
        self.project_id = project_id
        self.timeout = timeout
        self.sdk_header = (sdk_header or _default_sdk_header()).strip() or _default_sdk_header()
        self.demo_mode = demo_mode or api_key == DEMO_API_KEY

        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers={"Accept": "application/json", "X-Sepurux-SDK": self.sdk_header},
        )
        if self.demo_mode:
            warnings.warn("This is a limited demo environment.", stacklevel=2)

    def close(self) -> None:
        self._client.close()

    def upload_trace(self, trace: dict[str, Any] | TracePayload) -> str:
        if not isinstance(trace, dict):
            raise TypeError("trace must be a dictionary")

        response = self._client.post(
            "/v1/traces",
            headers=self._request_headers(),
            json=trace,
        )
        response.raise_for_status()

        payload = _parse_json_response(response)
        trace_id = payload.get("trace_id")
        if not isinstance(trace_id, str) or not trace_id:
            raise ValueError("Trace upload succeeded but trace_id was missing")
        return trace_id

    def create_campaign(
        self,
        *,
        name: str,
        mutation_set: Any,
        eval_set: Any,
        mutation_pack_id: str | None = None,
    ) -> str:
        payload: dict[str, Any] = {
            "name": name,
            "mutation_set": mutation_set,
            "eval_set": eval_set,
        }
        if mutation_pack_id:
            payload["mutation_pack_id"] = mutation_pack_id

        response = self._client.post(
            "/v1/campaigns",
            headers=self._request_headers(),
            json=payload,
        )
        response.raise_for_status()

        data = _parse_json_response(response)
        campaign_id = data.get("campaign_id")
        if not isinstance(campaign_id, str) or not campaign_id:
            raise ValueError("Campaign creation succeeded but campaign_id was missing")
        return campaign_id

    def start_run(
        self,
        *,
        trace_id: str,
        campaign_id: str,
        thresholds: dict[str, Any] | None = None,
    ) -> str:
        run_payload = {
            "trace_id": trace_id,
            "campaign_id": campaign_id,
        }

        # Prefer standard /v1/runs. If unavailable, fallback to CI endpoint.
        response = self._client.post(
            "/v1/runs",
            headers=self._request_headers(),
            json=run_payload,
        )

        if response.status_code in {404, 405}:
            ci_payload: dict[str, Any] = {
                "trace_id": trace_id,
                "campaign_id": campaign_id,
                "thresholds": thresholds
                or {
                    "min_pass_rate": 0.9,
                    "max_unsafe": 0,
                },
            }
            response = self._client.post(
                "/v1/ci/runs",
                headers=self._request_headers(),
                json=ci_payload,
            )

        response.raise_for_status()
        payload = _parse_json_response(response)
        run_id = payload.get("run_id")
        if not isinstance(run_id, str) or not run_id:
            raise ValueError("Run creation succeeded but run_id was missing")
        return run_id

    def get_demo_info(self) -> dict[str, Any]:
        response = self._client.get("/demo/info", headers={"Accept": "application/json"})
        response.raise_for_status()
        return _parse_json_response(response)

    def run_campaign(
        self,
        campaign_name_or_id: str,
        *,
        trace: dict[str, Any] | None = None,
    ) -> str:
        campaign_id = self._resolve_campaign_id(campaign_name_or_id)
        trace_payload = trace or _build_demo_trace(campaign_name_or_id)
        trace_id = self.upload_trace(trace_payload)
        return self.start_run(trace_id=trace_id, campaign_id=campaign_id)

    def get_run(self, run_id: str) -> RunStatus:
        response = self._client.get(
            f"/v1/runs/{run_id}",
            headers=self._request_headers(),
        )
        response.raise_for_status()

        payload = _parse_json_response(response)
        summary = payload.get("summary")
        return {
            "run_id": str(payload.get("run_id") or run_id),
            "status": str(payload.get("status") or "unknown"),
            "summary": summary if isinstance(summary, dict) else None,
        }

    def __enter__(self) -> SepuruxClient:
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        del exc_type, exc, tb
        self.close()

    def _request_headers(self) -> dict[str, str]:
        headers: dict[str, str] = {}
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        if self.project_id:
            headers["X-Project-Id"] = self.project_id
        headers["X-Sepurux-SDK"] = self.sdk_header
        return headers

    def _resolve_campaign_id(self, campaign_name_or_id: str) -> str:
        try:
            return str(UUID(campaign_name_or_id))
        except ValueError:
            pass

        response = self._client.get("/v1/campaigns", headers=self._request_headers())
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, list):
            raise ValueError("Expected campaign list response")
        for item in payload:
            if not isinstance(item, dict):
                continue
            name = item.get("name")
            campaign_id = item.get("campaign_id")
            if name == campaign_name_or_id and isinstance(campaign_id, str):
                return campaign_id
        raise ValueError(f"Campaign not found: {campaign_name_or_id}")


def _parse_json_response(response: httpx.Response) -> dict[str, Any]:
    data = response.json()
    if not isinstance(data, dict):
        raise ValueError("Expected JSON object response")
    return data


def _default_sdk_header() -> str:
    try:
        sdk_version = version(SDK_PACKAGE_NAME)
    except PackageNotFoundError:
        sdk_version = "dev"
    return f"py/{sdk_version}"


def _build_demo_trace(campaign_name_or_id: str) -> dict[str, Any]:
    return {
        "trace_version": "0.1",
        "source": "sdk-demo",
        "task": {
            "name": "demo_campaign_run",
            "input": {
                "campaign": campaign_name_or_id,
            },
        },
        "events": [
            {
                "type": "model",
                "name": "demo.start",
                "input": {"campaign": campaign_name_or_id},
            }
        ],
    }
