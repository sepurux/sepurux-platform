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
