from __future__ import annotations

import functools
import os
import time
import warnings
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from importlib.metadata import PackageNotFoundError, version
from typing import Any, ParamSpec, TypeVar
from uuid import UUID

import httpx

from .recorder import TraceRecorder, safe_json_value
from .types import CampaignReliability, CampaignRunResult, FailureRecord, RunStatus, TracePayload

SDK_PACKAGE_NAME = "sepurux"
DEMO_API_KEY = "demo_sepurux_key"
DEFAULT_BASE_URL = "http://localhost:8000"
P = ParamSpec("P")
R = TypeVar("R")


class ManagedTraceRecorder(TraceRecorder):
    def __init__(
        self,
        task_name: str,
        task_input: dict[str, Any] | None = None,
        *,
        source: str = "sdk",
        trace_version: str = "0.1",
    ) -> None:
        super().__init__(
            task_name=task_name,
            task_input=task_input,
            source=source,
            trace_version=trace_version,
        )
        self.trace_id: str | None = None
        self.run_id: str | None = None
        self.upload_error: Exception | None = None


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

    @classmethod
    def from_env(
        cls,
        *,
        base_url_env: str = "SEPURUX_API_BASE_URL",
        api_key_env: str = "SEPURUX_API_KEY",
        project_id_env: str = "SEPURUX_PROJECT_ID",
        default_base_url: str = DEFAULT_BASE_URL,
        timeout: float = 30,
        sdk_header: str | None = None,
        demo_mode: bool = False,
    ) -> SepuruxClient:
        base_url = os.getenv(base_url_env, default_base_url)
        return cls(
            base_url=base_url,
            api_key=os.getenv(api_key_env),
            project_id=os.getenv(project_id_env),
            timeout=timeout,
            sdk_header=sdk_header,
            demo_mode=demo_mode,
        )

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
        mutation_pack_id: str | None = None,
        thresholds: dict[str, Any] | None = None,
    ) -> str:
        run_payload = {
            "trace_id": trace_id,
            "campaign_id": campaign_id,
        }
        if mutation_pack_id:
            run_payload["mutation_pack_id"] = mutation_pack_id

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

    def run_pack(self, *, campaign_id: str, mutation_pack: str) -> str:
        response = self._client.post(
            f"/v1/campaigns/{campaign_id}/run-pack",
            headers=self._request_headers(),
            json={"pack": mutation_pack},
        )
        response.raise_for_status()
        payload = _parse_json_response(response)
        run_id = payload.get("run_id")
        if not isinstance(run_id, str) or not run_id:
            raise ValueError("Run-pack succeeded but run_id was missing")
        return run_id

    def get_demo_info(self) -> dict[str, Any]:
        response = self._client.get("/demo/info", headers={"Accept": "application/json"})
        response.raise_for_status()
        return _parse_json_response(response)

    @contextmanager
    def trace(
        self,
        task_name: str,
        task_input: dict[str, Any] | None = None,
        *,
        source: str = "sdk",
        trace_version: str = "0.1",
        campaign_id: str | None = None,
        mutation_pack: str | None = None,
        raise_on_error: bool = False,
        error_tool: str | None = None,
    ) -> Iterator[ManagedTraceRecorder]:
        if mutation_pack and not campaign_id:
            raise ValueError("campaign_id is required when mutation_pack is provided")

        recorder = ManagedTraceRecorder(
            task_name=task_name,
            task_input=task_input,
            source=source,
            trace_version=trace_version,
        )

        try:
            yield recorder
        except Exception as exc:
            recorder.error(tool=error_tool, message=str(exc))
            try:
                self._finalize_trace(
                    recorder,
                    campaign_id=campaign_id,
                    mutation_pack=mutation_pack,
                )
            except Exception as finalize_exc:
                recorder.upload_error = finalize_exc
            raise
        else:
            try:
                self._finalize_trace(
                    recorder,
                    campaign_id=campaign_id,
                    mutation_pack=mutation_pack,
                )
            except Exception as finalize_exc:
                recorder.upload_error = finalize_exc
                if raise_on_error:
                    raise

    def traceable(
        self,
        *,
        name: str | None = None,
        campaign_id: str | None = None,
        mutation_pack: str | None = None,
        source: str = "sdk",
        raise_on_error: bool = False,
    ) -> Callable[[Callable[P, R]], Callable[P, R]]:
        if mutation_pack and not campaign_id:
            raise ValueError("campaign_id is required when mutation_pack is provided")

        def decorator(func: Callable[P, R]) -> Callable[P, R]:
            @functools.wraps(func)
            def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
                task_name = name or func.__name__
                task_input = {
                    "function": func.__name__,
                    "args": safe_json_value(list(args)),
                    "kwargs": safe_json_value(dict(kwargs)),
                }

                with self.trace(
                    task_name,
                    task_input=task_input,
                    source=source,
                    campaign_id=campaign_id,
                    mutation_pack=mutation_pack,
                    raise_on_error=raise_on_error,
                    error_tool=func.__name__,
                ) as recorder:
                    recorder.model_step(
                        "function.call",
                        {"qualname": getattr(func, "__qualname__", func.__name__)},
                    )
                    result = func(*args, **kwargs)
                    recorder.model_step(
                        "function.return",
                        {"ok": True},
                        output=safe_json_value(result),
                    )
                    return result

            return wrapper

        return decorator

    def run_campaign(
        self,
        campaign_name_or_id: str,
        *,
        trace: dict[str, Any] | None = None,
        mutation_pack: str | None = None,
        wait_for_completion: bool = True,
        timeout_seconds: float = 60,
        poll_interval: float = 1.0,
    ) -> CampaignRunResult:
        campaign_id = self._resolve_campaign_id(campaign_name_or_id)
        trace_id: str | None = None
        if mutation_pack:
            run_id = self.run_pack(campaign_id=campaign_id, mutation_pack=mutation_pack)
        else:
            trace_payload = trace or _build_demo_trace(campaign_name_or_id)
            trace_id = self.upload_trace(trace_payload)
            run_id = self.start_run(trace_id=trace_id, campaign_id=campaign_id)

        if not wait_for_completion:
            return {
                "run_id": run_id,
                "campaign_id": campaign_id,
                "trace_id": trace_id,
                "status": "queued",
                "summary": None,
                "reliability_score": None,
                "reliability_status": None,
                "failures": [],
            }

        run_status = self._wait_for_run_completion(
            run_id,
            timeout_seconds=timeout_seconds,
            poll_interval=poll_interval,
        )
        reliability: CampaignReliability | None = None
        failures: list[FailureRecord] = []
        if run_status["status"] not in {"queued", "running", "pending"}:
            reliability = self.get_campaign_reliability(campaign_id, run_id=run_id)
            failures = self.get_campaign_failures(campaign_id, run_id=run_id)

        return {
            "run_id": run_id,
            "campaign_id": campaign_id,
            "trace_id": trace_id,
            "status": run_status["status"],
            "summary": run_status.get("summary"),
            "reliability_score": (
                float(reliability["reliability_score"])
                if reliability is not None and isinstance(reliability.get("reliability_score"), int | float)
                else None
            ),
            "reliability_status": (
                str(reliability["status"]) if reliability is not None and isinstance(reliability.get("status"), str) else None
            ),
            "failures": failures,
        }

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

    def get_campaign_failures(
        self,
        campaign_id: str,
        *,
        run_id: str | None = None,
        limit: int = 200,
        offset: int = 0,
    ) -> list[FailureRecord]:
        params: dict[str, Any] = {"limit": limit, "offset": offset}
        if run_id:
            params["run_id"] = run_id
        response = self._client.get(
            f"/v1/campaigns/{campaign_id}/failures",
            headers=self._request_headers(),
            params=params,
        )
        response.raise_for_status()
        payload = _parse_json_list_response(response)
        return [item for item in payload if isinstance(item, dict)]

    def get_campaign_reliability(
        self,
        campaign_id: str,
        *,
        run_id: str | None = None,
    ) -> CampaignReliability:
        params: dict[str, Any] = {}
        if run_id:
            params["run_id"] = run_id
        response = self._client.get(
            f"/v1/campaigns/{campaign_id}/reliability",
            headers=self._request_headers(),
            params=params,
        )
        response.raise_for_status()
        payload = _parse_json_response(response)
        return {
            "reliability_score": float(payload.get("reliability_score", 0.0)),
            "status": str(payload.get("status") or "healthy"),
            "classified_failures": int(payload.get("classified_failures", 0)),
            "failure_breakdown": (
                payload.get("failure_breakdown")
                if isinstance(payload.get("failure_breakdown"), list)
                else []
            ),
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

    def _finalize_trace(
        self,
        recorder: ManagedTraceRecorder,
        *,
        campaign_id: str | None = None,
        mutation_pack: str | None = None,
    ) -> None:
        recorder.trace_id = self.upload_trace(recorder.to_trace())
        if campaign_id:
            resolved_campaign_id = self._resolve_campaign_id(campaign_id)
            if mutation_pack:
                recorder.run_id = self.run_pack(
                    campaign_id=resolved_campaign_id,
                    mutation_pack=mutation_pack,
                )
            else:
                recorder.run_id = self.start_run(
                    trace_id=recorder.trace_id,
                    campaign_id=resolved_campaign_id,
                )

    def _wait_for_run_completion(
        self,
        run_id: str,
        *,
        timeout_seconds: float,
        poll_interval: float,
    ) -> RunStatus:
        deadline = time.monotonic() + timeout_seconds
        run_status = self.get_run(run_id)
        while run_status["status"] in {"queued", "running", "pending"} and time.monotonic() < deadline:
            time.sleep(poll_interval)
            run_status = self.get_run(run_id)
        return run_status


def _parse_json_response(response: httpx.Response) -> dict[str, Any]:
    data = response.json()
    if not isinstance(data, dict):
        raise ValueError("Expected JSON object response")
    return data


def _parse_json_list_response(response: httpx.Response) -> list[Any]:
    data = response.json()
    if not isinstance(data, list):
        raise ValueError("Expected JSON array response")
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
