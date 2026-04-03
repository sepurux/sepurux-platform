from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

from app.models import (
    ApiKey,
    Campaign,
    MutationPack,
    PolicyEvent,
    Project,
    ReplayAttempt,
    Run,
    SecurityEvent,
    Trace,
)
from app.mutation_registry import get_registered_pack_definition
from app.services.api_key_service import create_api_key_for_tenant
from app.services.mutation_pack_policy import coverage_score_for_config
from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

DEMO_API_KEY_PLAINTEXT = "demo_sepurux_key"
DEMO_PROJECT_NAME = "Sepurux Demo Project"
DEMO_CAMPAIGN_NAME = "demo_campaign"
DEMO_MUTATION_PACK_NAME = "core.reliability"
DEMO_ALLOWED_MUTATION_PACKS = {"core.reliability", "prompt.injection"}
DEMO_RECOMMENDED_FLOW = "session"

DEMO_MAX_CAMPAIGNS_PER_HOUR = 3
DEMO_MAX_MUTATIONS_PER_RUN = 20
DEMO_MAX_TRACES_UPLOAD_PER_HOUR = 10
DEMO_MAX_TRACE_BYTES = 256_000
DEMO_SESSION_TTL_MINUTES = 180
DEMO_SESSION_RATE_LIMIT_PER_MINUTE = 90
DEMO_SESSION_NAME_PREFIX = "demo-session:"
DEMO_MAX_SESSION_ISSUES_PER_10_MIN = 500
DEMO_TRACE_SOURCE = "demo.seed"
DEMO_TRACE_VERSION = "0.1"
DEMO_SEEDED_TRACES_TARGET = 6
DEMO_SEEDED_RUNS_TARGET = 6
DEMO_SEEDED_ATTEMPTS_PER_RUN = 6
# Two deterministic CI batch IDs for demo seeding — 3 runs per batch.
# These are stable across re-seeds so existing runs stay in the same batch.
DEMO_BATCH_IDS = [
    UUID("d0000001-0000-0000-0000-000000000001"),
    UUID("d0000001-0000-0000-0000-000000000002"),
]
DEMO_RUNS_PER_BATCH = 3  # DEMO_SEEDED_RUNS_TARGET // len(DEMO_BATCH_IDS)


def demo_info_payload() -> dict[str, Any]:
    return {
        "demo_api_key": DEMO_API_KEY_PLAINTEXT,
        "demo_campaign": DEMO_CAMPAIGN_NAME,
        "recommended_flow": DEMO_RECOMMENDED_FLOW,
        "allowed_mutation_packs": sorted(DEMO_ALLOWED_MUTATION_PACKS),
        "session_ttl_minutes": DEMO_SESSION_TTL_MINUTES,
        "limits": {
            "campaigns_per_hour": DEMO_MAX_CAMPAIGNS_PER_HOUR,
            "mutations_per_run": DEMO_MAX_MUTATIONS_PER_RUN,
            "traces_upload_per_hour": DEMO_MAX_TRACES_UPLOAD_PER_HOUR,
            "max_trace_bytes": DEMO_MAX_TRACE_BYTES,
        },
    }


def create_demo_session(db: Session) -> dict[str, Any]:
    now = datetime.now(UTC)
    _cleanup_stale_demo_session_keys(db, now=now)
    _enforce_demo_session_issuance_limit(db, now=now)

    project = _get_demo_project(db)
    _ensure_demo_workspace_seeded(db, project=project, now=now)
    session_name = f"{DEMO_SESSION_NAME_PREFIX}{uuid4().hex[:12]}"
    _, plaintext = create_api_key_for_tenant(
        db,
        tenant_id=project.tenant_id,
        project_id=project.project_id,
        user_id=project.owner_id,
        name=session_name,
        is_demo=True,
        rate_limit_per_minute=DEMO_SESSION_RATE_LIMIT_PER_MINUTE,
    )

    return {
        "api_key": plaintext,
        "project_id": project.project_id,
        "project_name": project.name,
        "demo_campaign": DEMO_CAMPAIGN_NAME,
        "demo_mutation_pack": DEMO_MUTATION_PACK_NAME,
        "expires_at": now + timedelta(minutes=DEMO_SESSION_TTL_MINUTES),
        "rate_limit_per_minute": DEMO_SESSION_RATE_LIMIT_PER_MINUTE,
        "limits": demo_info_payload()["limits"],
    }


def _get_demo_project(db: Session) -> Project:
    project = db.scalar(
        select(Project)
        .where(Project.name == DEMO_PROJECT_NAME)
        .order_by(Project.created_at.desc(), Project.project_id.desc())
    )
    if not isinstance(project, Project):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Demo environment is not available",
        )
    return project


def _cleanup_stale_demo_session_keys(db: Session, *, now: datetime) -> None:
    cutoff = now - timedelta(minutes=DEMO_SESSION_TTL_MINUTES)
    db.execute(
        delete(ApiKey).where(
            ApiKey.is_demo.is_(True),
            ApiKey.name.like(f"{DEMO_SESSION_NAME_PREFIX}%"),
            ApiKey.created_at < cutoff,
        )
    )


def _enforce_demo_session_issuance_limit(db: Session, *, now: datetime) -> None:
    window_start = now - timedelta(minutes=10)
    issued_count = db.scalar(
        select(func.count())
        .select_from(ApiKey)
        .where(
            ApiKey.is_demo.is_(True),
            ApiKey.name.like(f"{DEMO_SESSION_NAME_PREFIX}%"),
            ApiKey.created_at >= window_start,
        )
    )
    if int(issued_count or 0) >= DEMO_MAX_SESSION_ISSUES_PER_10_MIN:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demo is currently saturated. Retry in a few minutes.",
        )


def enforce_demo_campaign_create_limit(
    db: Session,
    *,
    project_id: UUID,
) -> None:
    window_start = datetime.now(UTC) - timedelta(hours=1)
    count = db.scalar(
        select(func.count())
        .select_from(Campaign)
        .where(
            Campaign.project_id == project_id,
            Campaign.created_at >= window_start,
        )
    )
    if int(count or 0) >= DEMO_MAX_CAMPAIGNS_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demo limit reached: max campaigns per hour exceeded",
        )


def enforce_demo_trace_upload_limits(
    db: Session,
    *,
    project_id: UUID,
    payload: Any,
) -> None:
    window_start = datetime.now(UTC) - timedelta(hours=1)
    count = db.scalar(
        select(func.count())
        .select_from(Trace)
        .where(
            Trace.project_id == project_id,
            Trace.created_at >= window_start,
        )
    )
    if int(count or 0) >= DEMO_MAX_TRACES_UPLOAD_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demo limit reached: max trace uploads per hour exceeded",
        )

    payload_size = len(json.dumps(payload, ensure_ascii=False).encode("utf-8"))
    if payload_size > DEMO_MAX_TRACE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Demo limit reached: trace payload is too large",
        )


def enforce_demo_run_limits(
    db: Session,
    *,
    project_id: UUID,
    campaign: Campaign,
) -> None:
    mutation_count = estimate_mutation_count(campaign.mutation_set)
    if mutation_count > DEMO_MAX_MUTATIONS_PER_RUN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Demo limit reached: max mutations per run exceeded",
        )

    window_start = datetime.now(UTC) - timedelta(hours=1)
    run_count = db.scalar(
        select(func.count())
        .select_from(Run)
        .where(
            Run.project_id == project_id,
            Run.campaign_id == campaign.campaign_id,
            Run.created_at >= window_start,
        )
    )
    if int(run_count or 0) >= DEMO_MAX_CAMPAIGNS_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demo limit reached: max campaign runs per hour exceeded",
        )


def enforce_demo_run_pack_limits(*, pack_name: str, mutation_count: int) -> None:
    if pack_name not in DEMO_ALLOWED_MUTATION_PACKS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo only allows core.reliability and prompt.injection mutation packs",
        )
    if mutation_count > DEMO_MAX_MUTATIONS_PER_RUN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Demo limit reached: max mutations per run exceeded",
        )


def estimate_mutation_count(mutation_set: Any) -> int:
    if isinstance(mutation_set, list):
        return len(mutation_set)
    if isinstance(mutation_set, dict):
        nested = mutation_set.get("mutations")
        if isinstance(nested, list):
            return len(nested)
        return 1
    if mutation_set is None:
        return 0
    return 1


def _ensure_demo_workspace_seeded(db: Session, *, project: Project, now: datetime) -> None:
    mutation_pack = _ensure_demo_mutation_pack(db, project=project)
    campaign = _ensure_demo_campaign(db, project=project, mutation_pack=mutation_pack)
    traces = _ensure_demo_traces(db, project=project, now=now)
    _ensure_demo_runs(db, project=project, campaign=campaign, traces=traces, now=now)


def _ensure_demo_mutation_pack(db: Session, *, project: Project) -> MutationPack:
    record = db.scalar(
        select(MutationPack)
        .where(
            MutationPack.project_id == project.project_id,
            MutationPack.name == DEMO_MUTATION_PACK_NAME,
            MutationPack.is_archived.is_(False),
        )
        .order_by(MutationPack.created_at.desc(), MutationPack.mutation_pack_id.desc())
    )
    if isinstance(record, MutationPack):
        return record

    definition = get_registered_pack_definition(DEMO_MUTATION_PACK_NAME)
    if definition is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Demo mutation pack registry is unavailable",
        )
    config = definition.get("config")
    if not isinstance(config, dict):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Demo mutation pack config is invalid",
        )

    record = MutationPack(
        mutation_pack_id=uuid4(),
        project_id=project.project_id,
        name=DEMO_MUTATION_PACK_NAME,
        description=str(definition.get("description") or "Seeded demo mutation pack"),
        config=config,
        is_system=True,
        coverage_score=coverage_score_for_config(config),
    )
    db.add(record)
    db.flush()
    return record


def _ensure_demo_campaign(
    db: Session,
    *,
    project: Project,
    mutation_pack: MutationPack,
) -> Campaign:
    record = db.scalar(
        select(Campaign)
        .where(
            Campaign.project_id == project.project_id,
            Campaign.name == DEMO_CAMPAIGN_NAME,
        )
        .order_by(Campaign.created_at.desc(), Campaign.campaign_id.desc())
    )
    if isinstance(record, Campaign):
        if record.mutation_pack_id != mutation_pack.mutation_pack_id:
            record.mutation_pack_id = mutation_pack.mutation_pack_id
            db.add(record)
            db.flush()
        return record

    record = Campaign(
        campaign_id=uuid4(),
        project_id=project.project_id,
        mutation_pack_id=mutation_pack.mutation_pack_id,
        name=DEMO_CAMPAIGN_NAME,
        status="ready",
        mutation_set=[
            {"mutation_id": "demo.baseline", "tool": "jira.create_issue"},
            {"mutation_id": "demo.timeout", "tool": "payments.refund"},
            {"mutation_id": "demo.latency", "tool": "slack.send_message"},
            {"mutation_id": "demo.schema", "tool": "mcp.search"},
        ],
        eval_set={"checks": ["demo.basic"]},
    )
    db.add(record)
    db.flush()
    return record


def _ensure_demo_traces(db: Session, *, project: Project, now: datetime) -> list[Trace]:
    records = list(
        db.scalars(
            select(Trace)
            .where(
                Trace.project_id == project.project_id,
                Trace.source == DEMO_TRACE_SOURCE,
            )
            .order_by(Trace.created_at.desc(), Trace.trace_id.desc())
        )
    )
    missing = max(DEMO_SEEDED_TRACES_TARGET - len(records), 0)
    if missing == 0:
        return records

    for i in range(missing):
        sample_index = len(records) + i + 1
        created_at = now - timedelta(minutes=sample_index * 4)
        trace = Trace(
            trace_id=uuid4(),
            project_id=project.project_id,
            source=DEMO_TRACE_SOURCE,
            trace_version=DEMO_TRACE_VERSION,
            sdk_meta="demo/web",
            validation_status="valid",
            validation_errors=None,
            normalized_payload={
                "trace_version": DEMO_TRACE_VERSION,
                "source": DEMO_TRACE_SOURCE,
                "task": {
                    "name": "demo.preview",
                    "input": {"scenario": f"seed-{sample_index}"},
                },
                "events": [
                    {
                        "type": "tool_call",
                        "tool": "jira.create_issue",
                        "args": {"title": f"Demo issue {sample_index}"},
                        "timestamp": created_at.isoformat(),
                        "index": 0,
                    },
                    {
                        "type": "tool_result",
                        "tool": "jira.create_issue",
                        "result": {"ok": True, "key": f"DEMO-{sample_index}"},
                        "timestamp": (created_at + timedelta(seconds=1)).isoformat(),
                        "index": 1,
                    },
                ],
            },
            s3_key=f"traces/demo-seed-{uuid4().hex}.json",
            created_at=created_at,
        )
        db.add(trace)
        records.append(trace)

    db.flush()
    records.sort(key=lambda record: (record.created_at, record.trace_id), reverse=True)
    return records


def _ensure_demo_runs(
    db: Session,
    *,
    project: Project,
    campaign: Campaign,
    traces: list[Trace],
    now: datetime,
) -> None:
    if not traces:
        return

    records = list(
        db.scalars(
            select(Run)
            .join(Trace, Trace.trace_id == Run.trace_id)
            .where(
                Run.project_id == project.project_id,
                Run.campaign_id == campaign.campaign_id,
                Trace.source == DEMO_TRACE_SOURCE,
            )
            .order_by(Run.created_at.asc(), Run.run_id.asc())
        )
    )

    for index, run in enumerate(records):
        batch_id = DEMO_BATCH_IDS[(index // DEMO_RUNS_PER_BATCH) % len(DEMO_BATCH_IDS)]
        summary = dict(run.summary or {})
        if "ci_batch_id" not in summary:
            summary["ci_batch_id"] = str(batch_id)
            run.summary = summary
            db.add(run)
        _ensure_demo_attempts_for_run(
            db,
            run=run,
            seed_index=index,
        )

    missing = max(DEMO_SEEDED_RUNS_TARGET - len(records), 0)
    for i in range(missing):
        run_index = len(records) + i
        batch_id = DEMO_BATCH_IDS[(run_index // DEMO_RUNS_PER_BATCH) % len(DEMO_BATCH_IDS)]
        trace = traces[run_index % len(traces)]
        attempts_total = DEMO_SEEDED_ATTEMPTS_PER_RUN
        failed_count = min(3, 1 + (run_index % 3))
        passed_count = max(attempts_total - failed_count, 0)
        unsafe_count = 1 if run_index % 3 == 0 else 0
        pass_rate = round(passed_count / attempts_total, 4) if attempts_total else 0.0
        created_at = now - timedelta(minutes=(run_index + 1) * 7)

        run = Run(
            run_id=uuid4(),
            project_id=project.project_id,
            trace_id=trace.trace_id,
            campaign_id=campaign.campaign_id,
            mutation_pack_id=campaign.mutation_pack_id,
            policy_pack_id=None,
            effective_policy_pack_version_id=None,
            status="completed",
            summary={
                "timeline_version": "0.1",
                "attempt_count": attempts_total,
                "passed_count": passed_count,
                "failed_count": failed_count,
                "failures": failed_count,
                "unsafe_count": unsafe_count,
                "unsafe_attempts": unsafe_count,
                "pass_rate": pass_rate,
                "policy_events_count": 1 if failed_count > 0 else 0,
                "security_events_count": 1 if unsafe_count > 0 else 0,
                "injection_blocks": 1 if unsafe_count > 0 else 0,
                "injection_sanitizations": 0,
                "ci_batch_id": str(batch_id),
                "demo_seed": True,
            },
            created_at=created_at,
        )
        db.add(run)
        db.flush()
        _ensure_demo_attempts_for_run(
            db,
            run=run,
            seed_index=run_index,
        )


def _ensure_demo_attempts_for_run(db: Session, *, run: Run, seed_index: int) -> None:
    existing_count = db.scalar(
        select(func.count()).select_from(ReplayAttempt).where(ReplayAttempt.run_id == run.run_id)
    )
    if int(existing_count or 0) > 0:
        return

    now = datetime.now(UTC)
    failed_budget = min(3, 1 + (seed_index % 3))

    seeded_attempts: list[ReplayAttempt] = []
    for attempt_index, blueprint in enumerate(
        _demo_seeded_attempt_blueprints(seed_index=seed_index, failed_budget=failed_budget)
    ):
        tool = str(blueprint["tool"])
        failed = bool(blueprint["failed"])
        mutation_id = str(blueprint["mutation_id"])
        mutation_details = blueprint.get("details")
        args = blueprint.get("args")
        attempt_id = uuid4()
        created_at = now - timedelta(minutes=seed_index * 7, seconds=attempt_index * 9)
        attempt = ReplayAttempt(
            attempt_id=attempt_id,
            project_id=run.project_id,
            run_id=run.run_id,
            mutation_id=mutation_id,
            result="failed" if failed else "passed",
            failure_reason=str(blueprint["failure_reason"]) if failed else None,
            first_failure_event_index=3 if failed else None,
            first_failure_tool=tool if failed else None,
            seed=10_000 + seed_index * 100 + attempt_index,
            mutation_trace={
                "seed": 10_000 + seed_index * 100 + attempt_index,
                "applied": [
                    {
                        "mutation_id": mutation_id,
                        "tool": tool,
                        "event_index": 3,
                        **({"details": mutation_details} if isinstance(mutation_details, dict) else {}),
                        **({"args": args} if isinstance(args, dict) else {}),
                    },
                ],
            },
            tools_touched=[tool],
            tool_call_counts={tool: int(blueprint.get("call_count", 1))},
            artifacts_s3_key=f"attempts/demo-{attempt_id.hex}.json",
            created_at=created_at,
        )
        db.add(attempt)
        seeded_attempts.append(attempt)

    db.flush()

    if seeded_attempts:
        first_failed = next((item for item in seeded_attempts if item.result == "failed"), None)
        if first_failed is not None:
            db.add(
                PolicyEvent(
                    policy_event_id=uuid4(),
                    run_id=run.run_id,
                    attempt_id=first_failed.attempt_id,
                    event_index=3,
                    tool=first_failed.first_failure_tool or "unknown",
                    action="execute",
                    decision="require_approval",
                    reason="demo policy gate",
                    input={"mode": "demo"},
                    created_at=first_failed.created_at,
                )
            )
            if first_failed.failure_reason == "unsafe_blocked":
                db.add(
                    SecurityEvent(
                        security_event_id=uuid4(),
                        run_id=run.run_id,
                        attempt_id=first_failed.attempt_id,
                        event_index=3,
                        tool=first_failed.first_failure_tool or "unknown",
                        zone="untrusted",
                        risk_score=0.91,
                        action="block",
                        matches=["prompt_injection"],
                        created_at=first_failed.created_at,
                    )
                )


def _demo_seeded_attempt_blueprints(*, seed_index: int, failed_budget: int) -> list[dict[str, Any]]:
    other_tools = [
        "jira.create_issue",
        "slack.send_message",
        "mcp.search",
        "github.create_pr",
    ]
    tail_tool = other_tools[seed_index % len(other_tools)]
    refund_args = {
        "payment_id": f"pay_demo_{seed_index + 1:02d}",
        "amount": 4200 + (seed_index * 100),
        "currency": "USD",
        "reason": "duplicate_charge",
    }
    refund_timeout = {
        "type": "fault.timeout",
        "timeout_ms": 3000,
        "min_backoff_ms": 300,
    }

    attempts: list[dict[str, Any]] = []
    for attempt_index in range(DEMO_SEEDED_ATTEMPTS_PER_RUN - 1):
        attempts.append(
            {
                "tool": "payments.refund",
                "mutation_id": "fault.timeout",
                "failed": attempt_index < failed_budget,
                "failure_reason": "timeout",
                "details": refund_timeout,
                "args": refund_args,
                "call_count": 1,
            }
        )

    attempts.append(
        {
            "tool": tail_tool,
            "mutation_id": "demo.baseline",
            "failed": False,
            "failure_reason": None,
            "details": None,
            "args": {"seed_index": seed_index, "tail_tool": tail_tool},
            "call_count": 1,
        }
    )
    return attempts
