from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import JSON, DateTime, Text, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


JSONB_COMPAT = JSON().with_variant(JSONB(), "postgresql")


class Trace(Base):
    __tablename__ = "traces"

    trace_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    s3_key: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Campaign(Base):
    __tablename__ = "campaigns"

    campaign_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    mutation_set: Mapped[Any] = mapped_column(JSONB_COMPAT, nullable=False)
    eval_set: Mapped[Any] = mapped_column(JSONB_COMPAT, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class PolicyPack(Base):
    __tablename__ = "policy_packs"

    policy_pack_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[str] = mapped_column(Text, nullable=False)
    policy: Mapped[Any] = mapped_column(JSONB_COMPAT, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Run(Base):
    __tablename__ = "runs"

    run_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    trace_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    campaign_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    policy_pack_id: Mapped[UUID | None] = mapped_column(Uuid, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[Any | None] = mapped_column(JSONB_COMPAT, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ReplayAttempt(Base):
    __tablename__ = "replay_attempts"

    attempt_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    run_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    mutation_id: Mapped[str] = mapped_column(Text, nullable=False)
    result: Mapped[str] = mapped_column(Text, nullable=False)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    first_failure_event_index: Mapped[int | None] = mapped_column(nullable=True)
    first_failure_tool: Mapped[str | None] = mapped_column(Text, nullable=True)
    tools_touched: Mapped[Any | None] = mapped_column(JSONB_COMPAT, nullable=True)
    tool_call_counts: Mapped[Any | None] = mapped_column(JSONB_COMPAT, nullable=True)
    artifacts_s3_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Counterfactual(Base):
    __tablename__ = "counterfactuals"

    counterfactual_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    attempt_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    strategy: Mapped[str] = mapped_column(Text, nullable=False)
    result: Mapped[str] = mapped_column(Text, nullable=False)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    metrics: Mapped[Any | None] = mapped_column(JSONB_COMPAT, nullable=True)
    diff: Mapped[Any | None] = mapped_column(JSONB_COMPAT, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class PolicyEvent(Base):
    __tablename__ = "policy_events"

    policy_event_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    run_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    attempt_id: Mapped[UUID | None] = mapped_column(Uuid, nullable=True)
    event_index: Mapped[int | None] = mapped_column(nullable=True)
    tool: Mapped[str] = mapped_column(Text, nullable=False)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    decision: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
