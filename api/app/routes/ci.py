from __future__ import annotations

import logging
import os
from math import ceil
from typing import Annotated, Any, Literal
from uuid import UUID, uuid4

from app.db import get_db
from app.models import Campaign, MutationPack, Project, Run, Trace
from app.schemas import (
    CIBatchStatusResponse,
    CIRunCreateRequest,
    CIRunCreateResponse,
    CIRunPreflightIssue,
    CIRunPreflightResponse,
    CIRunStatusResponse,
    CIRunThresholds,
    ContractReport,
    ToolCount,
)
from app.services.audit_service import create_audit_event
from app.services.billing_service import (
    InsufficientCreditsError,
    consume_credits_for_project_campaign,
    operation_cost_for_campaign_record,
    refund_credits_for_project_owner,
)
from app.services.contract_service import evaluate_contract, get_contract
from app.services.github_client import (
    GitHubClientError,
    format_pr_comment,
    post_pr_comment,
    resolve_github_access_token,
    set_pr_status,
)
from app.services.mutation_pack_policy import evaluate_mutation_pack_config
from app.services.run_service import (
    RelatedRecordNotFoundError,
    create_ci_batch_and_enqueue,
    get_run_quality_metrics,
    get_run_unscoped,
)
from app.services.tenant_control_service import (
    TenantControlViolationError,
    assert_project_runs_allowed,
)
from app.services.trace_bootstrap_service import build_bootstrap_policy_document
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/ci", tags=["ci"])

DbSession = Annotated[Session, Depends(get_db)]
_TERMINAL_STATUSES = {"completed", "done", "failed"}
CIDecision = Literal["pass", "fail", "pending"]
logger = logging.getLogger(__name__)


def _resolve_ci_trace_ids(
    payload: CIRunCreateRequest, campaign: Campaign
) -> list[UUID]:
    """Return the list of trace_ids to use for this CI run, checking min_scenarios."""
    eval_set = campaign.eval_set if isinstance(campaign.eval_set, dict) else {}
    eval_trace_ids_raw = eval_set.get("trace_ids")

    # Collect trace IDs: prefer eval_set list, fall back to request trace_id
    if isinstance(eval_trace_ids_raw, list) and eval_trace_ids_raw:
        try:
            trace_ids = [UUID(str(t)) for t in eval_trace_ids_raw]
        except (ValueError, AttributeError) as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Campaign eval_set contains invalid trace_ids.",
            ) from exc

        min_scenarios_raw = eval_set.get("min_scenarios")
        if isinstance(min_scenarios_raw, int) and min_scenarios_raw > 0:
            if len(trace_ids) < min_scenarios_raw:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        f"Campaign requires at least {min_scenarios_raw} scenario(s) in its "
                        f"eval set before CI can run, but only {len(trace_ids)} trace(s) are "
                        "registered. Add more traces via PATCH "
                        f"/v1/campaigns/{campaign.campaign_id}/eval-set."
                    ),
                )
        return trace_ids

    # Single-trace mode (backward-compatible)
    if payload.trace_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "trace_id is required when the campaign eval_set has no trace_ids. "
                "Either supply trace_id in the request or add traces via "
                f"PATCH /v1/campaigns/{campaign.campaign_id}/eval-set."
            ),
        )
    return [payload.trace_id]


def _campaign_mutation_set_is_empty(campaign: Campaign) -> bool:
    mutation_set = campaign.mutation_set
    if mutation_set is None:
        return True
    if isinstance(mutation_set, list):
        return len(mutation_set) == 0
    if isinstance(mutation_set, dict):
        nested = mutation_set.get("mutations")
        if isinstance(nested, list):
            return len(nested) == 0
        return len(mutation_set) == 0
    return False


def _campaign_mutation_items(campaign: Campaign) -> list[Any]:
    mutation_set = campaign.mutation_set
    if isinstance(mutation_set, list):
        return mutation_set or [{"mutation_id": "baseline"}]
    if isinstance(mutation_set, dict):
        nested = mutation_set.get("mutations")
        if isinstance(nested, list):
            return nested or [{"mutation_id": "baseline"}]
        return [mutation_set]
    if mutation_set is None:
        return [{"mutation_id": "baseline"}]
    return [mutation_set]


def _campaign_attempt_repeats(campaign: Campaign) -> int:
    eval_set = campaign.eval_set if isinstance(campaign.eval_set, dict) else {}
    raw_attempts = eval_set.get("attempts_count")
    if isinstance(raw_attempts, bool):
        return 1
    if isinstance(raw_attempts, int):
        return max(1, min(raw_attempts, 50))
    if isinstance(raw_attempts, float):
        return max(1, min(int(raw_attempts), 50))
    return 1


def _mutation_tool_and_args(mutation: Any) -> tuple[str | None, dict[str, Any], str]:
    mutation_obj = mutation if isinstance(mutation, dict) else {}
    mutation_id = str(
        mutation_obj.get("mutation_id")
        or mutation_obj.get("id")
        or mutation_obj.get("tool")
        or "mutation"
    )

    tool_obj = mutation_obj.get("tool")
    tool_name = tool_obj.strip() if isinstance(tool_obj, str) and tool_obj.strip() else None

    args_obj = mutation_obj.get("args")
    args: dict[str, Any] = dict(args_obj) if isinstance(args_obj, dict) else {}

    event_obj = mutation_obj.get("event")
    if isinstance(event_obj, dict):
        if tool_name is None:
            event_tool = event_obj.get("tool")
            if isinstance(event_tool, str) and event_tool.strip():
                tool_name = event_tool.strip()
        if not args:
            event_args = event_obj.get("args")
            if isinstance(event_args, dict):
                args = dict(event_args)

    for key in ("confirmation_token", "approval_token"):
        if key in mutation_obj and key not in args:
            args[key] = mutation_obj.get(key)

    return tool_name, args, mutation_id


def _approval_token_field(policy_doc: dict[str, Any]) -> str:
    approval_obj = policy_doc.get("approval")
    if isinstance(approval_obj, dict):
        token_field = approval_obj.get("token_field")
        if isinstance(token_field, str) and token_field.strip():
            return token_field.strip()
    return "confirmation_token"


def _irreversible_tools(policy_doc: dict[str, Any]) -> set[str]:
    irreversible_obj = policy_doc.get("irreversible")
    if not isinstance(irreversible_obj, dict):
        return set()
    tools_obj = irreversible_obj.get("tools")
    if not isinstance(tools_obj, list):
        return set()
    return {
        item.strip()
        for item in tools_obj
        if isinstance(item, str) and item.strip()
    }


def _has_approval_token(args: dict[str, Any], *, token_field: str) -> bool:
    token_value = args.get(token_field)
    if isinstance(token_value, str) and token_value.strip():
        return True
    if token_value is not None and bool(token_value):
        return True
    return bool(args.get("confirmation_token") or args.get("approval_token"))


def _trace_tools_for_ids(db: Session, *, project_id: UUID, trace_ids: list[UUID]) -> list[str]:
    if not trace_ids:
        return []
    traces = list(
        db.scalars(
            select(Trace).where(
                Trace.project_id == project_id,
                Trace.trace_id.in_(trace_ids),
            )
        )
    )
    seen: set[str] = set()
    ordered: list[str] = []
    for trace in traces:
        payload = trace.normalized_payload if isinstance(trace.normalized_payload, dict) else {}
        events = payload.get("events")
        if not isinstance(events, list):
            continue
        for event in events:
            if not isinstance(event, dict):
                continue
            event_type = event.get("type")
            if event_type not in {"tool_call", "tool_result"}:
                continue
            tool = event.get("tool")
            if not isinstance(tool, str):
                continue
            normalized = tool.strip()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            ordered.append(normalized)
    return ordered


def _build_ci_preflight(
    db: Session,
    *,
    payload: CIRunCreateRequest,
    campaign: Campaign,
    trace_ids: list[UUID] | None = None,
) -> CIRunPreflightResponse:
    blockers: list[CIRunPreflightIssue] = []
    warnings: list[CIRunPreflightIssue] = []
    resolved_trace_ids = list(trace_ids or [])

    if not resolved_trace_ids:
        try:
            resolved_trace_ids = _resolve_ci_trace_ids(payload, campaign)
        except HTTPException as exc:
            blockers.append(
                CIRunPreflightIssue(
                    code="trace_resolution_failed",
                    message=str(exc.detail),
                    hint="Register traces in campaign eval set or pass trace_id in the run request.",
                )
            )
            resolved_trace_ids = []

    mutation_items = _campaign_mutation_items(campaign)
    attempts_per_trace = len(mutation_items) * _campaign_attempt_repeats(campaign)
    estimated_attempts_total = attempts_per_trace * len(resolved_trace_ids)

    thresholds_payload = (
        payload.thresholds.model_dump(exclude_none=True)
        if hasattr(payload.thresholds, "model_dump")
        else payload.thresholds.dict(exclude_none=True)
    )
    thresholds = CIRunThresholds(**thresholds_payload)

    recommended_max_failures = 0
    if estimated_attempts_total > 0:
        recommended_max_failures = max(0, estimated_attempts_total - ceil(0.8 * estimated_attempts_total))
    recommended_thresholds = CIRunThresholds(
        min_pass_rate=0.8,
        max_unsafe=0,
        max_failures=recommended_max_failures,
    )

    if _campaign_mutation_set_is_empty(campaign):
        warnings.append(
            CIRunPreflightIssue(
                code="empty_mutation_set_auto_seeded",
                message=(
                    "Campaign mutation_set is empty. Worker will auto-seed a baseline mutation "
                    "from each trace."
                ),
                hint="Define explicit baseline mutations for predictable CI behavior.",
            )
        )

    if resolved_trace_ids:
        trace_records = list(
            db.scalars(
                select(Trace).where(
                    Trace.project_id == campaign.project_id,
                    Trace.trace_id.in_(resolved_trace_ids),
                )
            )
        )
        existing_trace_ids = {record.trace_id for record in trace_records}
        missing = [str(trace_id) for trace_id in resolved_trace_ids if trace_id not in existing_trace_ids]
        if missing:
            blockers.append(
                CIRunPreflightIssue(
                    code="trace_not_found",
                    message=f"{len(missing)} trace(s) referenced by the campaign were not found.",
                    hint="Re-open campaign scenarios and remove stale trace IDs.",
                )
            )

        discovered_tools = _trace_tools_for_ids(
            db,
            project_id=campaign.project_id,
            trace_ids=resolved_trace_ids,
        )
        if discovered_tools:
            policy_doc = build_bootstrap_policy_document(discovered_tools)
            token_field = _approval_token_field(policy_doc)
            irreversible = _irreversible_tools(policy_doc)
            missing_token_mutations: list[str] = []
            for mutation in mutation_items:
                tool_name, args, mutation_id = _mutation_tool_and_args(mutation)
                if tool_name is None or tool_name not in irreversible:
                    continue
                if _has_approval_token(args, token_field=token_field):
                    continue
                missing_token_mutations.append(f"{mutation_id} → {tool_name}")

            if missing_token_mutations:
                blockers.append(
                    CIRunPreflightIssue(
                        code="missing_confirmation_token",
                        message=(
                            "Policy will require approval tokens for one or more irreversible "
                            "tool calls, but campaign mutations do not provide them."
                        ),
                        hint=(
                            "Add confirmation_token (or approval_token) to these mutations: "
                            + ", ".join(missing_token_mutations[:6])
                        ),
                    )
                )

    if estimated_attempts_total > 0 and thresholds.max_failures is not None:
        max_failures_from_pass_rate = max(
            0,
            estimated_attempts_total
            - ceil(float(thresholds.min_pass_rate) * estimated_attempts_total),
        )
        if thresholds.max_failures < max_failures_from_pass_rate:
            warnings.append(
                CIRunPreflightIssue(
                    code="thresholds_stricter_than_pass_rate",
                    message=(
                        "Max failures is stricter than min pass rate for this attempt budget."
                    ),
                    hint=(
                        f"At {estimated_attempts_total} attempts and min pass "
                        f"{int(thresholds.min_pass_rate * 100)}%, a matching max_failures is "
                        f"{max_failures_from_pass_rate}."
                    ),
                )
            )

    # Quality contract pre-run validation
    contract = get_contract(db, campaign_id=campaign.campaign_id)
    if contract is not None:
        # Check required pack IDs (advisory only)
        required_pack_ids: list[str] = list(contract.required_pack_ids or [])
        if required_pack_ids:
            pack_id_str = str(campaign.mutation_pack_id) if campaign.mutation_pack_id else None
            if pack_id_str not in required_pack_ids:
                warnings.append(
                    CIRunPreflightIssue(
                        code="contract_wrong_pack",
                        message=(
                            f"Quality contract prefers one of {len(required_pack_ids)} configured "
                            f"pack(s), but campaign uses "
                            f"{'no pack' if pack_id_str is None else pack_id_str[:8] + '…'}."
                        ),
                        hint=(
                            "Run will proceed with auto trace-tool coverage. Optional: switch to one of these packs for preferred chaos overlays: "
                            + ", ".join(p[:8] + "…" for p in required_pack_ids[:4])
                        ),
                    )
                )

        # Check required tools against trace coverage
        required_tools: list[str] = list(contract.required_tools or [])
        if required_tools and resolved_trace_ids:
            all_trace_tools = _trace_tools_for_ids(
                db, project_id=campaign.project_id, trace_ids=resolved_trace_ids
            )
            covered = set(all_trace_tools)
            missing_tools = [t for t in required_tools if t not in covered]
            if missing_tools:
                blockers.append(
                    CIRunPreflightIssue(
                        code="contract_untested_tool",
                        message=(
                            f"{len(missing_tools)} tool(s) required by the quality contract "
                            "do not appear in any selected trace."
                        ),
                        hint=(
                            "Add traces that exercise these tools or update the contract: "
                            + ", ".join(missing_tools[:6])
                        ),
                    )
                )

        # Check minimum attempts
        min_attempts = contract.min_attempts_per_pack or 0
        if min_attempts > 0 and estimated_attempts_total < min_attempts:
            blockers.append(
                CIRunPreflightIssue(
                    code="contract_insufficient_attempts",
                    message=(
                        f"Quality contract requires at least {min_attempts} attempt(s), "
                        f"but this run estimates only {estimated_attempts_total}."
                    ),
                    hint=(
                        "Increase attempts_count in the campaign eval set or add more traces."
                    ),
                )
            )

    return CIRunPreflightResponse(
        ready=len(blockers) == 0,
        campaign_id=campaign.campaign_id,
        trace_count=len(resolved_trace_ids),
        attempts_per_trace=attempts_per_trace,
        estimated_attempts_total=estimated_attempts_total,
        thresholds=thresholds,
        blockers=blockers,
        warnings=warnings,
        recommended_thresholds=recommended_thresholds,
    )


@router.post("/preflight", response_model=CIRunPreflightResponse)
def post_ci_preflight(payload: CIRunCreateRequest, db: DbSession) -> CIRunPreflightResponse:
    campaign = db.scalar(select(Campaign).where(Campaign.campaign_id == payload.campaign_id))
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return _build_ci_preflight(
        db,
        payload=payload,
        campaign=campaign,
    )


@router.post("/runs", status_code=status.HTTP_201_CREATED, response_model=CIRunCreateResponse)
def post_ci_run(payload: CIRunCreateRequest, db: DbSession) -> CIRunCreateResponse:
    charged_amount: int | None = None
    charged_reason: str | None = None
    charged_project_id: UUID | None = None
    # Pre-fetch the campaign so we can compute the credit cost before creating the run.
    # create_ci_run_and_enqueue will re-validate below; the double query is intentional
    # so that a 402 is returned before any run record is written.
    campaign = db.scalar(select(Campaign).where(Campaign.campaign_id == payload.campaign_id))
    if campaign is not None:
        try:
            assert_project_runs_allowed(db, project_id=campaign.project_id)
        except TenantControlViolationError as exc:
            raise HTTPException(status_code=status.HTTP_423_LOCKED, detail=str(exc)) from exc

    def _refund(reason_suffix: str) -> None:
        if charged_amount is not None and charged_reason is not None and charged_project_id is not None:
            try:
                refund_credits_for_project_owner(
                    db,
                    project_id=charged_project_id,
                    amount=charged_amount,
                    reason=f"refund:{charged_reason}:{reason_suffix}",
                )
            except Exception:
                logger.exception("Failed to refund credits after %s", reason_suffix)

    try:
        if campaign is None:
            raise RelatedRecordNotFoundError("Campaign not found")

        trace_ids = _resolve_ci_trace_ids(payload, campaign)
        preflight = _build_ci_preflight(
            db,
            payload=payload,
            campaign=campaign,
            trace_ids=trace_ids,
        )
        if not preflight.ready:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "message": "CI preflight failed",
                    "blockers": [item.model_dump() for item in preflight.blockers],
                    "warnings": [item.model_dump() for item in preflight.warnings],
                },
            )

        try:
            pending_charge_amount, pending_charge_reason = operation_cost_for_campaign_record(
                campaign
            )
            consume_credits_for_project_campaign(
                db,
                project_id=campaign.project_id,
                campaign=campaign,
            )
            charged_amount = pending_charge_amount
            charged_reason = pending_charge_reason
            charged_project_id = campaign.project_id
        except InsufficientCreditsError as exc:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="insufficient_credits",
            ) from exc

        github_context = _build_github_context(payload)
        thresholds_payload = (
            payload.thresholds.model_dump(exclude_none=True)
            if hasattr(payload.thresholds, "model_dump")
            else payload.thresholds.dict(exclude_none=True)
        )

        batch_id = uuid4()
        runs = create_ci_batch_and_enqueue(
            db,
            trace_ids=trace_ids,
            campaign_id=payload.campaign_id,
            thresholds=thresholds_payload,
            batch_id=batch_id,
            github_context=github_context,
        )
        first_run_id = runs[0].run_id
        all_run_ids = [r.run_id for r in runs]
        return CIRunCreateResponse(
            run_id=first_run_id,
            run_ids=all_run_ids,
            batch_id=batch_id,
            trace_count=len(runs),
            warnings=preflight.warnings,
            estimated_attempts_total=preflight.estimated_attempts_total,
        )

    except RelatedRecordNotFoundError as exc:
        _refund("ci_run_creation_failed")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        _refund("ci_validation_failed")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except TenantControlViolationError as exc:
        _refund("tenant_runs_paused")
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail=str(exc)) from exc
    except HTTPException:
        _refund("ci_enqueue_failed")
        raise
    except Exception:
        _refund("ci_enqueue_failed")
        raise


@router.get("/runs/{run_id}", response_model=CIRunStatusResponse)
def get_ci_run(run_id: UUID, request: Request, db: DbSession) -> CIRunStatusResponse:
    run = get_run_unscoped(db, run_id=run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    thresholds = _extract_ci_thresholds(run.summary)
    if thresholds is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CI thresholds not found")

    metrics = get_run_quality_metrics(db, run_id=run.run_id, project_id=run.project_id)
    mutation_categories, mutation_coverage_score = _mutation_coverage_for_run(db, run=run)
    decision = _ci_decision(
        status=run.status,
        pass_rate=float(metrics["pass_rate"]),
        unsafe_attempts=int(metrics["unsafe_count"]),
        failures=int(metrics["failed_count"]),
        thresholds=thresholds,
        mutation_categories=mutation_categories,
    )

    if decision in {"pass", "fail"}:
        create_audit_event(
            db,
            project_id=run.project_id,
            event_type=f"ci.decision.{decision}",
            actor="ci",
            metadata={
                "run_id": str(run.run_id),
                "status": _public_ci_status(run.status),
                "decision": decision,
                "thresholds": thresholds,
                "pass_rate": float(metrics["pass_rate"]),
                "unsafe_attempts": int(metrics["unsafe_attempts"]),
                "failures": int(metrics["failures"]),
                "top_failing_tools": metrics["top_failing_tools"],
            },
        )
        _maybe_publish_github_report(
            db=db,
            run=run,
            request=request,
            decision=decision,
            thresholds=thresholds,
            metrics=metrics,
        )

    summary_dict = run.summary if isinstance(run.summary, dict) else {}
    batch_id_str = summary_dict.get("ci_batch_id")
    batch_trace_ids: list[str] = []
    if isinstance(batch_id_str, str):
        batch_trace_ids = _get_batch_trace_ids(db, batch_id=batch_id_str)
    trace_count = max(len(batch_trace_ids), 1)
    scenario_coverage_pct: float | None = None
    if batch_trace_ids:
        completed_in_batch = _count_completed_runs_in_batch(db, batch_id=batch_id_str)
        scenario_coverage_pct = round(completed_in_batch / trace_count * 100, 1)

    return CIRunStatusResponse(
        run_id=run.run_id,
        status=_public_ci_status(run.status),
        decision=decision,
        pass_rate=float(metrics["pass_rate"]),
        unsafe_attempts=int(metrics["unsafe_attempts"]),
        failures=int(metrics["failures"]),
        top_failing_tools=metrics["top_failing_tools"],
        mutation_categories=mutation_categories,
        mutation_coverage_score=mutation_coverage_score,
        dashboard_url=_build_dashboard_url(request, run.run_id),
        trace_count=trace_count,
        scenario_coverage_pct=scenario_coverage_pct,
    )


def _get_batch_trace_ids(db: Session, *, batch_id: str) -> list[str]:
    """Return all run trace_ids for a given batch_id (reads from run summary JSONB)."""
    runs = db.scalars(select(Run).where(Run.summary.isnot(None))).all()
    result: list[str] = []
    for run in runs:
        s = run.summary if isinstance(run.summary, dict) else {}
        if s.get("ci_batch_id") == batch_id:
            result.append(str(run.trace_id))
    return result


def _count_completed_runs_in_batch(db: Session, *, batch_id: str) -> int:
    runs = db.scalars(select(Run).where(Run.summary.isnot(None))).all()
    return sum(
        1
        for run in runs
        if isinstance(run.summary, dict)
        and run.summary.get("ci_batch_id") == batch_id
        and (run.status or "").lower() in _TERMINAL_STATUSES
    )


@router.get("/batch/{batch_id}", response_model=CIBatchStatusResponse)
def get_ci_batch(batch_id: UUID, request: Request, db: DbSession) -> CIBatchStatusResponse:
    batch_id_str = str(batch_id)
    runs = db.scalars(select(Run).where(Run.summary.isnot(None))).all()
    batch_runs = [
        run
        for run in runs
        if isinstance(run.summary, dict) and run.summary.get("ci_batch_id") == batch_id_str
    ]
    if not batch_runs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    trace_count = len(batch_runs)
    run_ids = [r.run_id for r in batch_runs]

    all_decisions: list[str] = []
    agg_pass_rates: list[float] = []
    agg_unsafe: int = 0
    agg_failures: int = 0
    agg_mutation_categories: set[str] = set()
    agg_mutation_coverage_scores: list[int] = []
    tool_counts: dict[str, int] = {}
    completed_count = 0
    total_attempts = 0

    for run in batch_runs:
        thresholds = _extract_ci_thresholds(run.summary)
        if thresholds is None:
            continue
        metrics = get_run_quality_metrics(db, run_id=run.run_id, project_id=run.project_id)
        mutation_categories, mutation_coverage_score = _mutation_coverage_for_run(db, run=run)
        decision = _ci_decision(
            status=run.status,
            pass_rate=float(metrics["pass_rate"]),
            unsafe_attempts=int(metrics["unsafe_count"]),
            failures=int(metrics["failed_count"]),
            thresholds=thresholds,
            mutation_categories=mutation_categories,
        )
        all_decisions.append(decision)
        agg_pass_rates.append(float(metrics["pass_rate"]))
        agg_unsafe += int(metrics["unsafe_attempts"])
        agg_failures += int(metrics["failures"])
        agg_mutation_categories.update(mutation_categories)
        if mutation_coverage_score is not None:
            agg_mutation_coverage_scores.append(mutation_coverage_score)
        for tool_item in metrics.get("top_failing_tools", []):
            t = tool_item.get("tool") if isinstance(tool_item, dict) else getattr(tool_item, "tool", None)
            c = tool_item.get("count", 0) if isinstance(tool_item, dict) else getattr(tool_item, "count", 0)
            if t:
                tool_counts[t] = tool_counts.get(t, 0) + c
        if (run.status or "").lower() in _TERMINAL_STATUSES:
            completed_count += 1
        total_attempts_raw = metrics.get("total_attempts")
        if not isinstance(total_attempts_raw, int | float):
            total_attempts_raw = metrics.get("attempt_count", 0)
        total_attempts += int(total_attempts_raw)

    if not all_decisions:
        batch_status = "pending"
        batch_decision: CIDecision = "pending"
    elif "pending" in all_decisions:
        batch_status = "running"
        batch_decision = "pending"
    elif "fail" in all_decisions:
        batch_status = "done"
        batch_decision = "fail"
    else:
        batch_status = "done"
        batch_decision = "pass"

    avg_pass_rate = sum(agg_pass_rates) / len(agg_pass_rates) if agg_pass_rates else 0.0
    scenario_coverage_pct = round(completed_count / trace_count * 100, 1)
    agg_coverage_score = (
        round(sum(agg_mutation_coverage_scores) / len(agg_mutation_coverage_scores))
        if agg_mutation_coverage_scores
        else None
    )
    top_tools = [
        ToolCount(tool=t, count=c)
        for t, c in sorted(tool_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    # Evaluate quality contract if the campaign has one (only when batch is done)
    contract_report: ContractReport | None = None
    if batch_status == "done" and batch_runs:
        campaign_id = batch_runs[0].campaign_id
        if campaign_id is not None:
            contract = get_contract(db, campaign_id=campaign_id)
            if contract is not None:
                contract_report = evaluate_contract(
                    contract,
                    batch_runs=list(batch_runs),
                    total_attempts=total_attempts,
                    db=db,
                )
                if not contract_report.passed:
                    batch_decision = "fail"

    return CIBatchStatusResponse(
        batch_id=batch_id,
        run_ids=run_ids,
        status=batch_status,
        decision=batch_decision,
        pass_rate=avg_pass_rate,
        unsafe_attempts=agg_unsafe,
        failures=agg_failures,
        trace_count=trace_count,
        scenario_coverage_pct=scenario_coverage_pct,
        top_failing_tools=top_tools,
        mutation_categories=sorted(agg_mutation_categories),
        mutation_coverage_score=agg_coverage_score,
        dashboard_url=_build_dashboard_url(request, run_ids[0]),
        contract_report=contract_report,
    )


def _extract_ci_thresholds(summary: Any) -> dict[str, Any] | None:
    if not isinstance(summary, dict):
        return None
    thresholds = summary.get("ci_thresholds")
    if not isinstance(thresholds, dict):
        return None
    required = {"min_pass_rate", "max_unsafe"}
    if not required.issubset(thresholds.keys()):
        return None
    return thresholds


def _ci_decision(
    *,
    status: str,
    pass_rate: float,
    unsafe_attempts: int,
    failures: int,
    thresholds: dict[str, Any],
    mutation_categories: list[str],
) -> CIDecision:
    if (status or "").lower() not in _TERMINAL_STATUSES:
        return "pending"

    min_pass_rate = float(thresholds["min_pass_rate"])
    max_unsafe = int(thresholds["max_unsafe"])
    max_failures_raw = thresholds.get("max_failures")
    max_failures = None if max_failures_raw is None else int(max_failures_raw)

    if pass_rate < min_pass_rate:
        return "fail"
    if unsafe_attempts > max_unsafe:
        return "fail"
    if max_failures is not None and failures > max_failures:
        return "fail"
    mutation_category_set = {
        item.strip().lower()
        for item in mutation_categories
        if isinstance(item, str) and item.strip()
    }
    min_mutation_categories_raw = thresholds.get("min_mutation_categories")
    if min_mutation_categories_raw is not None:
        min_mutation_categories = int(min_mutation_categories_raw)
        if len(mutation_category_set) < min_mutation_categories:
            return "fail"
    required_mutation_categories = _required_mutation_categories(thresholds)
    if required_mutation_categories and not required_mutation_categories.issubset(
        mutation_category_set
    ):
        return "fail"
    return "pass"


def _mutation_coverage_for_run(db: Session, *, run: Any) -> tuple[list[str], int | None]:
    mutation_pack_id = getattr(run, "mutation_pack_id", None)
    project_id = getattr(run, "project_id", None)
    if mutation_pack_id is None or project_id is None:
        return [], None

    mutation_pack = db.scalar(
        select(MutationPack).where(
            MutationPack.mutation_pack_id == mutation_pack_id,
            MutationPack.project_id == project_id,
        )
    )
    if mutation_pack is None:
        return [], None

    config = mutation_pack.config if isinstance(mutation_pack.config, dict) else {}
    coverage = evaluate_mutation_pack_config(config)
    return coverage.categories, coverage.coverage_score


def _required_mutation_categories(thresholds: dict[str, Any]) -> set[str]:
    raw_value = thresholds.get("required_mutation_categories")
    if not isinstance(raw_value, list):
        return set()
    return {
        str(item).strip().lower() for item in raw_value if isinstance(item, str) and item.strip()
    }


def _build_dashboard_url(request: Request, run_id: UUID) -> str:
    ui_base = os.getenv("SEPURUX_UI_BASE_URL")
    if ui_base:
        return f"{ui_base.rstrip('/')}/runs/{run_id}"
    base = str(request.base_url).rstrip("/")
    return f"{base}/runs/{run_id}"


def _public_ci_status(status: str) -> str:
    if (status or "").lower() == "completed":
        return "done"
    return status


def _build_github_context(payload: CIRunCreateRequest) -> dict[str, Any] | None:
    repo = (payload.repo or os.getenv("GITHUB_REPO") or "").strip()
    pr_number = payload.pull_request_number or _env_pull_request_number()

    if not repo and pr_number is None:
        return None
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="repo is required when pull_request_number is provided.",
        )
    if pr_number is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="pull_request_number is required when repo is provided.",
        )

    return {
        "repo": repo,
        "pull_request_number": pr_number,
    }


def _env_pull_request_number() -> int | None:
    raw = (os.getenv("PR_NUMBER") or "").strip()
    if not raw:
        return None
    try:
        value = int(raw)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PR_NUMBER must be an integer.",
        ) from exc
    if value < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PR_NUMBER must be greater than 0.",
        )
    return value


def _maybe_publish_github_report(
    *,
    db: Session,
    run: Any,
    request: Request,
    decision: CIDecision,
    thresholds: dict[str, Any],
    metrics: dict[str, Any],
) -> None:
    if decision not in {"pass", "fail"}:
        return

    summary = dict(run.summary) if isinstance(run.summary, dict) else {}
    github_context = summary.get("github_context")
    if not isinstance(github_context, dict):
        return

    repo = github_context.get("repo")
    pr_number = github_context.get("pull_request_number")
    if not isinstance(repo, str) or not repo.strip() or not isinstance(pr_number, int):
        return

    github_reporting = summary.get("github_reporting")
    if (
        isinstance(github_reporting, dict)
        and github_reporting.get("comment_posted")
        and github_reporting.get("status_set")
    ):
        return

    score = _reliability_score(summary, metrics)
    threshold = _reliability_threshold(thresholds)
    dashboard_url = _build_dashboard_url(request, run.run_id)
    token = _resolve_github_token(db, project_id=run.project_id, repo=repo)
    if token is None:
        logger.warning(
            "Skipping GitHub PR reporting for run %s (missing GitHub token)",
            run.run_id,
        )
        return

    comment_posted = False
    status_set = False
    next_reporting: dict[str, Any] = (
        github_reporting.copy() if isinstance(github_reporting, dict) else {}
    )

    try:
        comment_payload = post_pr_comment(
            repo,
            pr_number,
            format_pr_comment(
                {
                    "score": score,
                    "threshold": threshold,
                    "failures": metrics.get("top_failing_tools"),
                    "dashboard_url": dashboard_url,
                }
            ),
            access_token=token,
        )
        comment_posted = True
        next_reporting["comment_url"] = comment_payload.get("html_url")
    except GitHubClientError as exc:
        logger.warning("Failed posting PR comment for run %s: %s", run.run_id, exc)

    try:
        status_payload = set_pr_status(
            repo,
            pr_number,
            passed=score >= threshold,
            description=f"Reliability {score:.1f}% (threshold {threshold:.1f}%)",
            target_url=dashboard_url,
            access_token=token,
        )
        status_set = True
        next_reporting["status_url"] = status_payload.get("url")
    except GitHubClientError as exc:
        logger.warning("Failed setting PR status for run %s: %s", run.run_id, exc)

    if not comment_posted and not status_set:
        return

    next_reporting["comment_posted"] = comment_posted or bool(next_reporting.get("comment_posted"))
    next_reporting["status_set"] = status_set or bool(next_reporting.get("status_set"))
    next_reporting["reliability_score"] = score
    next_reporting["threshold"] = threshold
    summary["github_reporting"] = next_reporting
    run.summary = summary
    db.add(run)
    db.commit()


def _resolve_github_token(db: Session, *, project_id: UUID, repo: str) -> str | None:
    project = db.scalar(select(Project).where(Project.project_id == project_id))
    owner_id = project.owner_id if isinstance(project, Project) else None
    integration_token = resolve_github_access_token(
        db,
        user_id=owner_id,
        repo=repo,
    )
    if isinstance(integration_token, str) and integration_token.strip():
        return integration_token

    env_token = (os.getenv("GITHUB_TOKEN") or "").strip()
    if env_token:
        return env_token
    return None


def _reliability_score(summary: dict[str, Any], metrics: dict[str, Any]) -> float:
    value = summary.get("reliability_score")
    if isinstance(value, int | float):
        return float(value)
    pass_rate = metrics.get("pass_rate")
    if isinstance(pass_rate, int | float):
        return float(pass_rate) * 100.0
    return 0.0


def _reliability_threshold(thresholds: dict[str, Any]) -> float:
    explicit = thresholds.get("min_reliability_score")
    if isinstance(explicit, int | float):
        return float(explicit)

    min_pass_rate = thresholds.get("min_pass_rate")
    if isinstance(min_pass_rate, int | float):
        return float(min_pass_rate) * 100.0
    return 80.0
