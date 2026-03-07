from __future__ import annotations

from typing import Any

import httpx

from .types import RunStatus, TracePayload


class CrashLabClient:
    def __init__(
        self,
        base_url: str,
        api_key: str | None = None,
        project_id: str | None = None,
        timeout: float = 30,
    ) -> None:
        normalized = base_url.strip().rstrip("/")
        if not normalized:
            raise ValueError("base_url must be a non-empty URL")

        self.base_url = normalized
        self.api_key = api_key
        self.project_id = project_id
        self.timeout = timeout

        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers={"Accept": "application/json"},
        )

    def close(self) -> None:
        self._client.close()

    def upload_trace(self, trace: dict[str, Any] | TracePayload) -> str:
        if not isinstance(trace, dict):
            raise TypeError("trace must be a dictionary")

        response = self._client.post(
            "/v1/traces",
            headers=self._auth_headers(),
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
            headers=self._auth_headers(),
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
            headers=self._auth_headers(),
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
                headers=self._auth_headers(),
                json=ci_payload,
            )

        response.raise_for_status()
        payload = _parse_json_response(response)
        run_id = payload.get("run_id")
        if not isinstance(run_id, str) or not run_id:
            raise ValueError("Run creation succeeded but run_id was missing")
        return run_id

    def get_run(self, run_id: str) -> RunStatus:
        response = self._client.get(
            f"/v1/runs/{run_id}",
            headers=self._auth_headers(),
        )
        response.raise_for_status()

        payload = _parse_json_response(response)
        summary = payload.get("summary")
        return {
            "run_id": str(payload.get("run_id") or run_id),
            "status": str(payload.get("status") or "unknown"),
            "summary": summary if isinstance(summary, dict) else None,
        }

    def __enter__(self) -> CrashLabClient:
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        del exc_type, exc, tb
        self.close()

    def _auth_headers(self) -> dict[str, str]:
        headers: dict[str, str] = {}
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        if self.project_id:
            headers["X-Project-Id"] = self.project_id
        return headers


def _parse_json_response(response: httpx.Response) -> dict[str, Any]:
    data = response.json()
    if not isinstance(data, dict):
        raise ValueError("Expected JSON object response")
    return data
