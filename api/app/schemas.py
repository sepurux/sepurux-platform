from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class TraceMetadata(BaseModel):
    trace_id: UUID
    source: str
    s3_key: str
    created_at: datetime


class CampaignCreateRequest(BaseModel):
    name: str
    mutation_set: Any
    eval_set: Any


class CampaignMetadata(BaseModel):
    campaign_id: UUID
    name: str
    mutation_set: Any
    eval_set: Any
    created_at: datetime


class RunCreateRequest(BaseModel):
    trace_id: UUID
    campaign_id: UUID


class RunMetadata(BaseModel):
    run_id: UUID
    trace_id: UUID
    campaign_id: UUID
    status: str
    summary: Any | None
    created_at: datetime


class ReplayAttemptListItem(BaseModel):
    attempt_id: UUID
    mutation_id: str
    result: str
    failure_reason: str | None
    first_failure_event_index: int | None
    first_failure_tool: str | None
    created_at: datetime


class ReplayAttemptDetail(BaseModel):
    attempt_id: UUID
    run_id: UUID
    mutation_id: str
    result: str
    failure_reason: str | None
    artifacts_s3_key: str | None
    first_failure_event_index: int | None
    first_failure_tool: str | None
    created_at: datetime


class RunAttemptsSummary(BaseModel):
    total: int
    passed: int
    failed: int
    pass_rate: float


class ToolCountPct(BaseModel):
    tool: str
    count: int
    pct: float


class MutationCountPct(BaseModel):
    mutation_id: str
    count: int
    pct: float


class ReasonCountPct(BaseModel):
    reason: str
    count: int
    pct: float


class EventIndexCount(BaseModel):
    event_index: int
    count: int


class RunStatsResponse(BaseModel):
    run_id: UUID
    attempts: RunAttemptsSummary
    failures_by_tool: list[ToolCountPct]
    failures_by_mutation: list[MutationCountPct]
    top_failure_reasons: list[ReasonCountPct]
    first_failure_step_distribution: list[EventIndexCount]


class ToolFragilityTopMutation(BaseModel):
    mutation_id: str
    count: int


class ToolFragilityTopReason(BaseModel):
    reason: str
    count: int


class ToolFragilityItem(BaseModel):
    tool: str
    attempts: int
    failures: int
    failure_rate: float
    top_mutations: list[ToolFragilityTopMutation]
    top_reasons: list[ToolFragilityTopReason]


class ToolFragilityResponse(BaseModel):
    window_days: int
    generated_at: datetime
    attempts_definition: str
    tools: list[ToolFragilityItem]


class MutationSummaryTopTool(BaseModel):
    tool: str
    count: int


class MutationSummaryTopReason(BaseModel):
    reason: str
    count: int


class MutationSummaryItem(BaseModel):
    mutation_id: str
    failures: int
    top_tools: list[MutationSummaryTopTool]
    top_reasons: list[MutationSummaryTopReason]


class MutationSummaryResponse(BaseModel):
    window_days: int
    mutations: list[MutationSummaryItem]


class CounterfactualMetadata(BaseModel):
    counterfactual_id: UUID
    attempt_id: UUID
    strategy: str
    result: str
    failure_reason: str | None
    metrics: Any | None
    diff: Any | None
    created_at: datetime


class CounterfactualListItem(BaseModel):
    strategy: str
    result: str
    failure_reason: str | None
    metrics: Any | None
    diff: Any | None
    created_at: datetime
