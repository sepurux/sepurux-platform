from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


JSONB_COMPAT = JSON().with_variant(JSONB(), "postgresql")


class PlaceholderRecord(Base):
    __tablename__ = "placeholder_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, default="placeholder")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Tenant(Base):
    __tablename__ = "tenants"

    tenant_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Project(Base):
    __tablename__ = "projects"

    project_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    tenant_id: Mapped[UUID] = mapped_column(ForeignKey("tenants.tenant_id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class ApiKey(Base):
    __tablename__ = "api_keys"

    api_key_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    tenant_id: Mapped[UUID] = mapped_column(ForeignKey("tenants.tenant_id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    key_hash: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Trace(Base):
    __tablename__ = "traces"

    trace_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    s3_key: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Campaign(Base):
    __tablename__ = "campaigns"

    campaign_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    mutation_set: Mapped[Any] = mapped_column(JSONB_COMPAT, nullable=False)
    eval_set: Mapped[Any] = mapped_column(JSONB_COMPAT, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Run(Base):
    __tablename__ = "runs"

    run_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    trace_id: Mapped[UUID] = mapped_column(ForeignKey("traces.trace_id"), nullable=False)
    campaign_id: Mapped[UUID] = mapped_column(ForeignKey("campaigns.campaign_id"), nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[Any | None] = mapped_column(JSONB_COMPAT, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class ReplayAttempt(Base):
    __tablename__ = "replay_attempts"

    attempt_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    run_id: Mapped[UUID] = mapped_column(ForeignKey("runs.run_id"), nullable=False)
    mutation_id: Mapped[str] = mapped_column(Text, nullable=False)
    result: Mapped[str] = mapped_column(Text, nullable=False)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    first_failure_event_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    first_failure_tool: Mapped[str | None] = mapped_column(Text, nullable=True)
    artifacts_s3_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Counterfactual(Base):
    __tablename__ = "counterfactuals"

    counterfactual_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.project_id"), nullable=False)
    attempt_id: Mapped[UUID] = mapped_column(
        ForeignKey("replay_attempts.attempt_id"), nullable=False
    )
    strategy: Mapped[str] = mapped_column(Text, nullable=False)
    result: Mapped[str] = mapped_column(Text, nullable=False)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    metrics: Mapped[Any | None] = mapped_column(JSONB_COMPAT, nullable=True)
    diff: Mapped[Any | None] = mapped_column(JSONB_COMPAT, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
