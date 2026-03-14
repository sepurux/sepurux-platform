from __future__ import annotations

from typing import Any, TypedDict


class TaskPayload(TypedDict):
    name: str
    input: dict[str, Any]


TraceEvent = dict[str, Any]


class TracePayload(TypedDict):
    trace_version: str
    source: str
    task: TaskPayload
    events: list[TraceEvent]


class TraceMetadata(TypedDict, total=False):
    trace_id: str
    source: str
    trace_version: str
    task_name: str | None
    sdk_meta: str | None
    validation_status: str
    validation_errors: list[dict[str, str]] | None
    normalized_summary: dict[str, Any] | None
    s3_key: str
    payload: Any | None
    created_at: str


class TraceTimelineStep(TypedDict, total=False):
    id: str
    trace_id: str
    step_type: str
    step_name: str
    mutation_name: str | None
    status: str
    input_payload: Any | None
    output_payload: Any | None
    latency_ms: int | None
    started_at: str
    finished_at: str | None
    metadata: dict[str, Any] | None


class RunStatus(TypedDict, total=False):
    run_id: str
    status: str
    summary: dict[str, Any] | None


class FailureRecord(TypedDict, total=False):
    failure_id: str
    run_id: str
    campaign_id: str
    trace_id: str
    mutation: str
    type: str
    severity: str
    description: str
    metadata: dict[str, Any] | None
    created_at: str


class CampaignReliability(TypedDict, total=False):
    reliability_score: float
    status: str
    classified_failures: int
    failure_breakdown: list[dict[str, Any]]


class CampaignRunResult(TypedDict, total=False):
    run_id: str
    campaign_id: str
    trace_id: str | None
    status: str
    summary: dict[str, Any] | None
    reliability_score: float | None
    reliability_status: str | None
    failures: list[FailureRecord]
