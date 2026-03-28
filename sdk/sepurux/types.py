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


class TraceBootstrapCampaign(TypedDict, total=False):
    campaign_id: str
    name: str
    mutation_pack_id: str
    mutation_pack_name: str
    created: bool


class TraceBootstrapResponse(TypedDict, total=False):
    trace_id: str
    tools_discovered: list[str]
    tool_zones_created: int
    tool_zones_updated: int
    policy_pack_id: str | None
    policy_pack_name: str | None
    policy_pack_created: bool
    campaigns: list[TraceBootstrapCampaign]


class RunStatus(TypedDict, total=False):
    run_id: str
    status: str
    summary: dict[str, Any] | None


class CIRunThresholds(TypedDict, total=False):
    min_pass_rate: float
    max_unsafe: int
    max_failures: int | None
    min_reliability_score: float | None
    min_mutation_categories: int | None
    required_mutation_categories: list[str] | None


class CIRunStatus(TypedDict, total=False):
    batch_id: str
    run_id: str
    run_ids: list[str]
    trace_count: int
    scenario_coverage_pct: float
    status: str
    decision: str
    pass_rate: float
    unsafe_attempts: int
    failures: int
    top_failing_tools: list[dict[str, Any]]
    mutation_categories: list[str]
    mutation_coverage_score: int | None
    dashboard_url: str


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
    batch_id: str | None
    run_id: str
    run_ids: list[str]
    campaign_id: str
    trace_id: str | None
    status: str
    summary: dict[str, Any] | None
    reliability_score: float | None
    reliability_status: str | None
    failures: list[FailureRecord]
