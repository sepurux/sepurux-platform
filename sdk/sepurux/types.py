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
