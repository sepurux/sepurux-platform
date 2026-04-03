from __future__ import annotations

from collections import Counter
from fnmatch import fnmatchcase
import hashlib
import json
from typing import Any
from uuid import UUID, uuid4

from app.models import (
    Campaign,
    MutationPack,
    PolicyEvent,
    PolicyPack,
    PolicyPackVersion,
    ReplayAttempt,
    Run,
    SecurityEvent,
    Trace,
)
from app.queue import get_run_queue
from app.services.audit_service import create_audit_event
from app.services.contract_service import get_contract
from app.services.policy_service import get_policy_pack_active_version, update_policy_pack
from app.services.trace_replay_profile import (
    choose_primary_baseline_candidate,
    derive_trace_baseline_candidates,
    get_uploaded_trace_primary_mutation,
    get_uploaded_trace_hardening,
    infer_trace_hardening_from_payload,
    resolve_uploaded_trace_baseline_candidates,
    tool_likely_requires_confirmation,
)
from app.services.tenant_control_service import assert_project_runs_allowed
from app.services.trace_bootstrap_service import (
    build_bootstrap_policy_document,
    extract_tools_from_trace_payload,
)
from app.services.trace_intake import create_trace
from sqlalchemy import select
from sqlalchemy.orm import Session

DEFAULT_BOOTSTRAP_POLICY_PACK_NAME = "trace.bootstrap.default"


class RelatedRecordNotFoundError(Exception):
    pass


def create_run(
    db: Session,
    *,
    project_id: UUID,
    trace_id: UUID,
    campaign_id: UUID,
    mutation_pack_id: UUID | None = None,
    policy_pack_id: UUID | None = None,
    actor: str | None = None,
) -> Run:
    assert_project_runs_allowed(db, project_id=project_id)

    effective_policy_pack_id = policy_pack_id
    policy_pack: PolicyPack | None = None
    effective_policy_pack_version_id: UUID | None = None

    if (
        db.scalar(select(Trace).where(Trace.trace_id == trace_id, Trace.project_id == project_id))
        is None
    ):
        raise RelatedRecordNotFoundError("Trace not found")
    campaign = db.scalar(
        select(Campaign).where(
            Campaign.campaign_id == campaign_id,
            Campaign.project_id == project_id,
            Campaign.status != "archived",
        )
    )
    if campaign is None:
        raise RelatedRecordNotFoundError("Campaign not found")

    effective_mutation_pack_id = (
        mutation_pack_id if mutation_pack_id is not None else campaign.mutation_pack_id
    )
    if effective_mutation_pack_id is not None and (
        db.scalar(
            select(MutationPack).where(
                MutationPack.mutation_pack_id == effective_mutation_pack_id,
                MutationPack.project_id == project_id,
                MutationPack.is_archived.is_(False),
            )
        )
        is None
    ):
        raise RelatedRecordNotFoundError("Mutation pack not found")

    if effective_policy_pack_id is None:
        policy_pack = db.scalar(
            select(PolicyPack)
            .where(
                PolicyPack.project_id == project_id,
                PolicyPack.name == DEFAULT_BOOTSTRAP_POLICY_PACK_NAME,
                PolicyPack.is_archived.is_(False),
            )
            .order_by(PolicyPack.created_at.desc(), PolicyPack.policy_pack_id.desc())
            .limit(1)
        )
        if policy_pack is not None:
            effective_policy_pack_id = policy_pack.policy_pack_id

    if effective_policy_pack_id is not None:
        if policy_pack is not None and policy_pack.policy_pack_id == effective_policy_pack_id:
            selected_policy_pack: PolicyPack | None = policy_pack
        else:
            selected_policy_pack = db.scalar(
                select(PolicyPack).where(
                    PolicyPack.policy_pack_id == effective_policy_pack_id,
                    PolicyPack.project_id == project_id,
                    PolicyPack.is_archived.is_(False),
                )
            )
        policy_pack = selected_policy_pack
        if policy_pack is None:
            raise RelatedRecordNotFoundError("Policy pack not found")
        active_version = get_policy_pack_active_version(db, policy_pack=policy_pack)
        if isinstance(active_version, PolicyPackVersion):
            effective_policy_pack_version_id = active_version.version_id

    return _create_run_record(
        db,
        project_id=project_id,
        trace_id=trace_id,
        campaign_id=campaign_id,
        mutation_pack_id=effective_mutation_pack_id,
        policy_pack_id=effective_policy_pack_id,
        effective_policy_pack_version_id=effective_policy_pack_version_id,
        summary=None,
        actor=actor,
    )


def _create_run_record(
    db: Session,
    *,
    project_id: UUID,
    trace_id: UUID,
    campaign_id: UUID,
    mutation_pack_id: UUID | None,
    policy_pack_id: UUID | None,
    effective_policy_pack_version_id: UUID | None,
    summary: Any | None,
    actor: str | None,
) -> Run:
    run = Run(
        run_id=uuid4(),
        project_id=project_id,
        trace_id=trace_id,
        campaign_id=campaign_id,
        mutation_pack_id=mutation_pack_id,
        policy_pack_id=policy_pack_id,
        effective_policy_pack_version_id=effective_policy_pack_version_id,
        status="queued",
        summary=summary,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    create_audit_event(
        db,
        project_id=project_id,
        event_type="run.created",
        actor=actor,
        metadata={
            "run_id": str(run.run_id),
            "trace_id": str(run.trace_id),
            "campaign_id": str(run.campaign_id),
            "mutation_pack_id": (
                str(run.mutation_pack_id) if run.mutation_pack_id is not None else None
            ),
            "policy_pack_id": str(run.policy_pack_id) if run.policy_pack_id is not None else None,
            "effective_policy_pack_version_id": (
                str(run.effective_policy_pack_version_id)
                if run.effective_policy_pack_version_id is not None
                else None
            ),
            "status": run.status,
            "summary": run.summary,
        },
    )
    return run


def enqueue_execute_run(run: Run, *, queue_priority: str = "normal") -> None:
    # Use a fully-qualified function path so RQ workers can import it reliably.
    queue = (
        get_run_queue() if queue_priority == "normal" else get_run_queue(priority=queue_priority)
    )
    queue.enqueue("worker.execute_run", str(run.run_id))


def create_run_and_enqueue(
    db: Session,
    *,
    project_id: UUID,
    trace_id: UUID,
    campaign_id: UUID,
    mutation_pack_id: UUID | None = None,
    policy_pack_id: UUID | None = None,
    queue_priority: str = "normal",
    actor: str | None = None,
) -> Run:
    run = create_run(
        db=db,
        project_id=project_id,
        trace_id=trace_id,
        campaign_id=campaign_id,
        mutation_pack_id=mutation_pack_id,
        policy_pack_id=policy_pack_id,
        actor=actor,
    )
    enqueue_execute_run(run, queue_priority=queue_priority)
    return run


def _build_ci_policy_pack(
    db: Session,
    *,
    project_id: UUID,
    trace_ids: list[UUID] | None = None,
    actor: str | None = None,
) -> tuple[UUID | None, UUID | None]:
    bootstrap_pack = db.scalar(
        select(PolicyPack)
        .where(
            PolicyPack.project_id == project_id,
            PolicyPack.name == DEFAULT_BOOTSTRAP_POLICY_PACK_NAME,
            PolicyPack.is_archived.is_(False),
        )
        .order_by(PolicyPack.created_at.desc(), PolicyPack.policy_pack_id.desc())
        .limit(1)
    )
    if bootstrap_pack is None:
        return None, None

    if trace_ids:
        traces_by_id = {
            trace.trace_id: trace
            for trace in db.scalars(
                select(Trace).where(
                    Trace.project_id == project_id,
                    Trace.trace_id.in_(trace_ids),
                )
            )
        }
        discovered_tools: list[str] = []
        seen_tools: set[str] = set()
        for trace_id in trace_ids:
            trace = traces_by_id.get(trace_id)
            if trace is None:
                continue
            payload = trace.normalized_payload if isinstance(trace.normalized_payload, dict) else {}
            for tool in extract_tools_from_trace_payload(payload):
                if tool in seen_tools:
                    continue
                seen_tools.add(tool)
                discovered_tools.append(tool)

        if discovered_tools:
            desired_policy = build_bootstrap_policy_document(discovered_tools)
            active_version = get_policy_pack_active_version(db, policy_pack=bootstrap_pack)
            active_policy = (
                active_version.policy
                if isinstance(active_version, PolicyPackVersion)
                and isinstance(active_version.policy, dict)
                else (bootstrap_pack.policy if isinstance(bootstrap_pack.policy, dict) else None)
            )
            if active_policy != desired_policy:
                updated_pack = update_policy_pack(
                    db,
                    project_id=project_id,
                    policy_pack_id=bootstrap_pack.policy_pack_id,
                    name=bootstrap_pack.name,
                    engine=bootstrap_pack.engine,
                    policy=desired_policy,
                    created_by=(actor or "system"),
                    actor=actor,
                )
                if isinstance(updated_pack, PolicyPack):
                    bootstrap_pack = updated_pack

    active_version = get_policy_pack_active_version(db, policy_pack=bootstrap_pack)
    version_id = (
        active_version.version_id if isinstance(active_version, PolicyPackVersion) else None
    )
    return bootstrap_pack.policy_pack_id, version_id


def create_ci_run_and_enqueue(
    db: Session,
    *,
    trace_id: UUID,
    campaign_id: UUID,
    thresholds: dict[str, Any],
    github_context: dict[str, Any] | None = None,
    batch_id: UUID | None = None,
    actor: str | None = "ci",
) -> Run:
    trace = db.scalar(select(Trace).where(Trace.trace_id == trace_id))
    if trace is None:
        raise RelatedRecordNotFoundError("Trace not found")

    campaign = db.scalar(select(Campaign).where(Campaign.campaign_id == campaign_id))
    if campaign is None:
        raise RelatedRecordNotFoundError("Campaign not found")
    if campaign.status == "archived":
        raise RelatedRecordNotFoundError("Campaign not found")

    if trace.project_id != campaign.project_id:
        raise ValueError("Trace and campaign must belong to the same project")
    assert_project_runs_allowed(db, project_id=campaign.project_id)

    project_id = trace.project_id
    effective_policy_pack_id, effective_policy_pack_version_id = _build_ci_policy_pack(
        db,
        project_id=project_id,
        trace_ids=[trace_id],
        actor=actor,
    )

    contract = get_contract(db, campaign_id=campaign.campaign_id)
    required_tools = list(contract.required_tools or []) if contract is not None else []
    resolved_mutation_set = _resolve_ci_mutation_set(
        campaign,
        trace=trace,
        required_tools=required_tools,
    )
    trace_hardening = _infer_trace_hardening(trace)
    summary: dict[str, Any] = {
        "ci_thresholds": thresholds,
        "campaign_name": campaign.name,
        "resolved_mutation_set": resolved_mutation_set,
        "replay_seed_basis": _ci_replay_seed_basis(
            trace=trace,
            campaign=campaign,
            resolved_mutation_set=resolved_mutation_set,
        ),
    }
    if trace_hardening is not None:
        summary["trace_hardening"] = trace_hardening
    if isinstance(github_context, dict):
        summary["github_context"] = github_context
    if batch_id is not None:
        summary["ci_batch_id"] = str(batch_id)

    run = _create_run_record(
        db,
        project_id=project_id,
        trace_id=trace_id,
        campaign_id=campaign_id,
        mutation_pack_id=campaign.mutation_pack_id,
        policy_pack_id=effective_policy_pack_id,
        effective_policy_pack_version_id=effective_policy_pack_version_id,
        summary=summary,
        actor=actor,
    )
    enqueue_execute_run(run, queue_priority="normal")
    return run


def create_ci_batch_and_enqueue(
    db: Session,
    *,
    trace_ids: list[UUID],
    campaign_id: UUID,
    thresholds: dict[str, Any],
    batch_id: UUID,
    github_context: dict[str, Any] | None = None,
    actor: str | None = "ci",
) -> list[Run]:
    """Create one CI run per trace_id and tag them all with the same batch_id."""
    campaign = db.scalar(select(Campaign).where(Campaign.campaign_id == campaign_id))
    if campaign is None:
        raise RelatedRecordNotFoundError("Campaign not found")
    if campaign.status == "archived":
        raise RelatedRecordNotFoundError("Campaign not found")

    assert_project_runs_allowed(db, project_id=campaign.project_id)
    project_id = campaign.project_id

    effective_policy_pack_id, effective_policy_pack_version_id = _build_ci_policy_pack(
        db,
        project_id=project_id,
        trace_ids=trace_ids,
        actor=actor,
    )

    runs: list[Run] = []
    contract = get_contract(db, campaign_id=campaign.campaign_id)
    required_tools = list(contract.required_tools or []) if contract is not None else []
    for trace_id in trace_ids:
        trace = db.scalar(select(Trace).where(Trace.trace_id == trace_id))
        if trace is None:
            raise RelatedRecordNotFoundError(f"Trace {trace_id} not found")
        if trace.project_id != project_id:
            raise ValueError(f"Trace {trace_id} does not belong to this project")
        resolved_mutation_set = _resolve_ci_mutation_set(
            campaign,
            trace=trace,
            required_tools=required_tools,
        )
        trace_hardening = _infer_trace_hardening(trace)

        summary: dict[str, Any] = {
            "ci_thresholds": thresholds,
            "ci_batch_id": str(batch_id),
            "campaign_name": campaign.name,
            "resolved_mutation_set": resolved_mutation_set,
            "replay_seed_basis": _ci_replay_seed_basis(
                trace=trace,
                campaign=campaign,
                resolved_mutation_set=resolved_mutation_set,
            ),
        }
        if trace_hardening is not None:
            summary["trace_hardening"] = trace_hardening
        if isinstance(github_context, dict):
            summary["github_context"] = github_context

        run = _create_run_record(
            db,
            project_id=project_id,
            trace_id=trace_id,
            campaign_id=campaign_id,
            mutation_pack_id=campaign.mutation_pack_id,
            policy_pack_id=effective_policy_pack_id,
            effective_policy_pack_version_id=effective_policy_pack_version_id,
            summary=summary,
            actor=actor,
        )
        enqueue_execute_run(run, queue_priority="normal")
        runs.append(run)

    return runs


def _extract_replay_tool_name(mutation: Any) -> str | None:
    mutation_obj = mutation if isinstance(mutation, dict) else {}

    tool = mutation_obj.get("tool")
    if isinstance(tool, str) and tool.strip():
        return tool.strip()

    event_obj = mutation_obj.get("event")
    if isinstance(event_obj, dict):
        event_tool = event_obj.get("tool")
        if isinstance(event_tool, str) and event_tool.strip():
            return event_tool.strip()

    return None


def _extract_trace_scope_ids(mutation: Any) -> set[str]:
    mutation_obj = mutation if isinstance(mutation, dict) else {}
    values: list[object] = []

    trace_ids_obj = mutation_obj.get("trace_ids")
    if isinstance(trace_ids_obj, list):
        values.extend(trace_ids_obj)

    trace_id_obj = mutation_obj.get("trace_id")
    if trace_id_obj is not None:
        values.append(trace_id_obj)

    scoped_ids: set[str] = set()
    for value in values:
        try:
            scoped_ids.add(str(UUID(str(value))))
        except (TypeError, ValueError, AttributeError):
            continue
    return scoped_ids


def _mutation_matches_trace_tools(
    mutation: Any,
    *,
    trace_id: UUID,
    trace_tools: list[str],
) -> bool:
    scoped_trace_ids = _extract_trace_scope_ids(mutation)
    if scoped_trace_ids:
        return str(trace_id) in scoped_trace_ids

    tool_name = _extract_replay_tool_name(mutation)
    if tool_name is None:
        return True

    return any(
        tool_name == trace_tool or fnmatchcase(trace_tool, tool_name)
        for trace_tool in trace_tools
    )


def _resolve_trace_scoped_mutation_set(
    campaign: Campaign,
    *,
    trace: Trace,
) -> list[Any]:
    mutation_set = campaign.mutation_set
    if isinstance(mutation_set, list):
        mutation_items = mutation_set or [{"mutation_id": "baseline"}]
    elif isinstance(mutation_set, dict):
        nested = mutation_set.get("mutations")
        if isinstance(nested, list):
            mutation_items = nested or [{"mutation_id": "baseline"}]
        else:
            mutation_items = [mutation_set]
    elif mutation_set is None:
        mutation_items = [{"mutation_id": "baseline"}]
    else:
        mutation_items = [mutation_set]

    payload = trace.normalized_payload if isinstance(trace.normalized_payload, dict) else {}
    trace_tools = extract_tools_from_trace_payload(payload)

    matched = [
        mutation
        for mutation in mutation_items
        if _mutation_matches_trace_tools(
            mutation,
            trace_id=trace.trace_id,
            trace_tools=trace_tools,
        )
    ]
    if matched:
        return matched
    return mutation_items


def _resolve_ci_mutation_set(
    campaign: Campaign,
    *,
    trace: Trace,
    required_tools: list[str],
) -> list[Any]:
    resolved = _resolve_trace_scoped_mutation_set(campaign, trace=trace)
    if not _mutation_set_needs_contract_fallback(resolved):
        return resolved

    payload = trace.normalized_payload if isinstance(trace.normalized_payload, dict) else {}
    uploaded_primary = get_uploaded_trace_primary_mutation(payload)
    if uploaded_primary is not None:
        return [uploaded_primary]

    fallback_candidates = derive_trace_baseline_candidates(payload)
    primary_candidate = choose_primary_baseline_candidate(fallback_candidates)
    if primary_candidate is not None:
        return [primary_candidate]

    uploaded_candidates = resolve_uploaded_trace_baseline_candidates(payload)
    if uploaded_candidates:
        return uploaded_candidates

    synthesized = _synthesize_trace_scoped_mutations_from_required_tools(
        trace=trace,
        required_tools=required_tools,
    )
    synthesized_primary = choose_primary_baseline_candidate(synthesized)
    if synthesized_primary is not None:
        return [synthesized_primary]
    return resolved


def _mutation_set_needs_contract_fallback(mutation_set: list[Any]) -> bool:
    if not mutation_set:
        return True
    return all(_extract_replay_tool_name(item) is None for item in mutation_set)


def _synthesize_trace_scoped_mutations_from_required_tools(
    *,
    trace: Trace,
    required_tools: list[str],
) -> list[dict[str, Any]]:
    if not required_tools:
        return []

    payload = trace.normalized_payload if isinstance(trace.normalized_payload, dict) else {}
    events = payload.get("events")
    if not isinstance(events, list):
        return []

    synthesized: list[dict[str, Any]] = []
    seen_tools: set[str] = set()
    for required_tool in required_tools:
        if required_tool in seen_tools:
            continue
        for event in events:
            if not isinstance(event, dict):
                continue
            if event.get("type") != "tool_call":
                continue
            tool = event.get("tool")
            if not isinstance(tool, str) or tool != required_tool:
                continue
            args = event.get("args")
            if not isinstance(args, dict):
                continue

            mutation_args = dict(args)
            if tool_likely_requires_confirmation(required_tool):
                mutation_args.setdefault("confirmation_token", "approved")

            synthesized.append(
                {
                    "mutation_id": f"baseline.{required_tool}",
                    "tool": required_tool,
                    "args": mutation_args,
                }
            )
            seen_tools.add(required_tool)
            break

    return synthesized

def _ci_replay_seed_basis(
    *,
    trace: Trace,
    campaign: Campaign,
    resolved_mutation_set: list[Any],
) -> str:
    payload = {
        "trace_id": str(trace.trace_id),
        "campaign_id": str(campaign.campaign_id),
        "mutation_pack_id": (
            str(campaign.mutation_pack_id) if campaign.mutation_pack_id is not None else None
        ),
        "resolved_mutation_set": resolved_mutation_set,
    }
    digest = hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str).encode()
    ).hexdigest()
    return f"ci:{digest}"


def _infer_trace_hardening(trace: Trace) -> dict[str, Any] | None:
    payload = trace.normalized_payload if isinstance(trace.normalized_payload, dict) else {}
    uploaded_hardening = get_uploaded_trace_hardening(payload)
    if uploaded_hardening is not None:
        return uploaded_hardening
    return infer_trace_hardening_from_payload(payload)


def get_run(db: Session, *, project_id: UUID, run_id: UUID) -> Run | None:
    stmt = select(Run).where(Run.run_id == run_id, Run.project_id == project_id)
    return db.scalar(stmt)


def get_run_unscoped(db: Session, *, run_id: UUID) -> Run | None:
    return db.scalar(select(Run).where(Run.run_id == run_id))


def list_recent_runs(
    db: Session,
    *,
    project_id: UUID,
    limit: int = 20,
    offset: int = 0,
    status: str | None = None,
) -> list[Run]:
    stmt = select(Run).where(Run.project_id == project_id)
    normalized_status = (status or "").strip().lower()
    if normalized_status:
        stmt = stmt.where(Run.status == normalized_status)
    stmt = stmt.order_by(Run.created_at.desc(), Run.run_id.desc()).offset(offset).limit(limit)
    return list(db.scalars(stmt))


def run_metadata(run: Run) -> dict[str, Any]:
    summary = run.summary if isinstance(run.summary, dict) else None
    summary_attempts = _summary_int(summary, "attempt_count")
    summary_passed = _summary_int(summary, "passed_count")
    summary_unsafe = _summary_int(summary, "unsafe_count")
    if summary_unsafe is None:
        summary_unsafe = _summary_int(summary, "unsafe_attempts")
    summary_pass_rate = _summary_float(summary, "pass_rate")
    if summary_pass_rate is None and summary_attempts is not None and summary_passed is not None:
        summary_pass_rate = _ratio(summary_passed, summary_attempts)

    return {
        "run_id": run.run_id,
        "trace_id": run.trace_id,
        "campaign_id": run.campaign_id,
        "mutation_pack_id": run.mutation_pack_id,
        "policy_pack_id": run.policy_pack_id,
        "effective_policy_pack_version_id": run.effective_policy_pack_version_id,
        "status": run.status,
        "summary": run.summary,
        "pass_rate": summary_pass_rate,
        "unsafe_count": summary_unsafe,
        "created_at": run.created_at,
    }


def create_run_pack_and_enqueue(
    db: Session,
    *,
    project_id: UUID,
    campaign: Campaign,
    mutation_pack: MutationPack,
    queue_priority: str = "normal",
    actor: str | None = None,
) -> Run:
    trace_payload = _build_synthetic_campaign_trace_payload(
        campaign=campaign,
        mutation_pack=mutation_pack,
    )
    trace = create_trace(
        db,
        project_id=project_id,
        payload=trace_payload,
        source="campaign.run_pack",
        trace_version="0.1",
        sdk_meta="api/run-pack",
        validation_status="valid",
        validation_errors=None,
        normalized_payload=trace_payload,
        actor=actor,
    )
    return create_run_and_enqueue(
        db,
        project_id=project_id,
        trace_id=trace.trace_id,
        campaign_id=campaign.campaign_id,
        mutation_pack_id=mutation_pack.mutation_pack_id,
        queue_priority=queue_priority,
        actor=actor,
    )


def _build_synthetic_campaign_trace_payload(
    *,
    campaign: Campaign,
    mutation_pack: MutationPack,
) -> dict[str, Any]:
    task_name = campaign.name.strip() or "campaign.run_pack"
    return {
        "trace_version": "0.1",
        "source": "campaign.run_pack",
        "task": {
            "name": task_name,
            "input": {
                "campaign_id": str(campaign.campaign_id),
                "campaign_name": campaign.name,
                "mutation_pack": mutation_pack.name,
            },
        },
        "events": [
            {
                "index": 0,
                "type": "tool_call",
                "tool": "campaign.load",
                "args": {
                    "campaign_id": str(campaign.campaign_id),
                    "mutation_pack": mutation_pack.name,
                },
            },
            {
                "index": 1,
                "type": "tool_result",
                "tool": "campaign.load",
                "result": {
                    "ok": True,
                    "campaign_name": campaign.name,
                    "mutation_pack": mutation_pack.name,
                },
            },
        ],
    }


def get_run_quality_metrics(
    db: Session,
    *,
    run_id: UUID,
    project_id: UUID | None = None,
) -> dict[str, Any]:
    stmt = select(ReplayAttempt).where(ReplayAttempt.run_id == run_id)
    if project_id is not None:
        stmt = stmt.where(ReplayAttempt.project_id == project_id)
    attempts = list(db.scalars(stmt))

    total = len(attempts)
    passed_count = 0
    failed_count = 0
    unsafe_count = 0
    failures_by_tool: Counter[str] = Counter()

    for attempt in attempts:
        if _is_pass_result(attempt.result):
            passed_count += 1
        if _is_fail_result(attempt.result):
            failed_count += 1
            failures_by_tool[attempt.first_failure_tool or "unknown"] += 1
        if _is_unsafe_attempt(attempt):
            unsafe_count += 1

    failures_by_tool_pct = [
        {
            "tool": tool,
            "count": count,
            "pct": _ratio(count, failed_count),
        }
        for tool, count in _sorted_counter_items(failures_by_tool)
    ]
    top_failing_tools = [
        {"tool": item["tool"], "count": item["count"]} for item in failures_by_tool_pct[:3]
    ]

    return {
        "attempt_count": total,
        "passed_count": passed_count,
        "failed_count": failed_count,
        "failures": failed_count,
        "pass_rate": _ratio(passed_count, total),
        "unsafe_count": unsafe_count,
        "unsafe_attempts": unsafe_count,
        "failures_by_tool": failures_by_tool_pct,
        "top_failing_tools": top_failing_tools,
    }


def list_policy_events_for_run(
    db: Session,
    *,
    run_id: UUID,
    project_id: UUID,
    limit: int = 50,
    offset: int = 0,
) -> list[PolicyEvent]:
    stmt = (
        select(PolicyEvent)
        .join(Run, Run.run_id == PolicyEvent.run_id)
        .where(
            PolicyEvent.run_id == run_id,
            Run.project_id == project_id,
        )
        .order_by(PolicyEvent.created_at.asc(), PolicyEvent.policy_event_id.asc())
        .offset(offset)
        .limit(limit)
    )
    return list(db.scalars(stmt))


def list_security_events_for_run(
    db: Session,
    *,
    run_id: UUID,
    project_id: UUID,
    limit: int = 50,
    offset: int = 0,
) -> list[SecurityEvent]:
    stmt = (
        select(SecurityEvent)
        .join(Run, Run.run_id == SecurityEvent.run_id)
        .where(
            SecurityEvent.run_id == run_id,
            Run.project_id == project_id,
        )
        .order_by(SecurityEvent.created_at.asc(), SecurityEvent.security_event_id.asc())
        .offset(offset)
        .limit(limit)
    )
    return list(db.scalars(stmt))


def _summary_int(summary: dict[str, Any] | None, key: str) -> int | None:
    if summary is None:
        return None
    value = summary.get(key)
    if isinstance(value, int):
        return value
    return None


def _summary_float(summary: dict[str, Any] | None, key: str) -> float | None:
    if summary is None:
        return None
    value = summary.get(key)
    if isinstance(value, int | float):
        return float(value)
    return None


def _is_pass_result(result: str | None) -> bool:
    return (result or "").lower() in {"pass", "passed"}


def _is_fail_result(result: str | None) -> bool:
    return (result or "").lower() in {"fail", "failed"}


def _is_unsafe_attempt(attempt: ReplayAttempt) -> bool:
    reason = (attempt.failure_reason or "").lower()
    # We don't persist per-attempt metrics on ReplayAttempt, so use failure_reason conventions.
    # Keep policy_blocked for backwards compatibility with existing worker outcomes.
    return reason.startswith("unsafe") or reason == "policy_blocked"


def _ratio(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round(numerator / denominator, 4)


def _sorted_counter_items(counter: Counter[str]) -> list[tuple[str, int]]:
    return sorted(counter.items(), key=lambda item: (-item[1], item[0]))
