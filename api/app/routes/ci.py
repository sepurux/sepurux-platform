from __future__ import annotations

import logging
import os
from typing import Annotated, Any, Literal
from uuid import UUID

from app.db import get_db
from app.models import Campaign, MutationPack, Project
from app.schemas import CIRunCreateRequest, CIRunCreateResponse, CIRunStatusResponse
from app.services.audit_service import create_audit_event
from app.services.billing_service import (
    InsufficientCreditsError,
    consume_credits_for_project_campaign,
    operation_cost_for_campaign_record,
    refund_credits_for_project_owner,
)
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
    create_ci_run_and_enqueue,
    get_run_quality_metrics,
    get_run_unscoped,
)
from app.services.tenant_control_service import (
    TenantControlViolationError,
    assert_project_runs_allowed,
)
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/ci", tags=["ci"])

DbSession = Annotated[Session, Depends(get_db)]
_TERMINAL_STATUSES = {"completed", "done", "failed"}
CIDecision = Literal["pass", "fail", "pending"]
logger = logging.getLogger(__name__)


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

        try:
            charged_amount, charged_reason = operation_cost_for_campaign_record(campaign)
            charged_project_id = campaign.project_id
            consume_credits_for_project_campaign(
                db,
                project_id=campaign.project_id,
                campaign=campaign,
            )
        except InsufficientCreditsError as exc:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="insufficient_credits",
            ) from exc

    try:
        github_context = _build_github_context(payload)
        thresholds_payload = (
            payload.thresholds.model_dump(exclude_none=True)
            if hasattr(payload.thresholds, "model_dump")
            else payload.thresholds.dict(exclude_none=True)
        )
        run = create_ci_run_and_enqueue(
            db,
            trace_id=payload.trace_id,
            campaign_id=payload.campaign_id,
            thresholds=thresholds_payload,
            github_context=github_context,
        )
    except RelatedRecordNotFoundError as exc:
        if (
            charged_amount is not None
            and charged_reason is not None
            and charged_project_id is not None
        ):
            try:
                refund_credits_for_project_owner(
                    db,
                    project_id=charged_project_id,
                    amount=charged_amount,
                    reason=f"refund:{charged_reason}:ci_run_creation_failed",
                )
            except Exception:
                logger.exception("Failed to refund credits after CI run creation failure")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        if (
            charged_amount is not None
            and charged_reason is not None
            and charged_project_id is not None
        ):
            try:
                refund_credits_for_project_owner(
                    db,
                    project_id=charged_project_id,
                    amount=charged_amount,
                    reason=f"refund:{charged_reason}:ci_validation_failed",
                )
            except Exception:
                logger.exception("Failed to refund credits after CI validation failure")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except TenantControlViolationError as exc:
        if (
            charged_amount is not None
            and charged_reason is not None
            and charged_project_id is not None
        ):
            try:
                refund_credits_for_project_owner(
                    db,
                    project_id=charged_project_id,
                    amount=charged_amount,
                    reason=f"refund:{charged_reason}:tenant_runs_paused",
                )
            except Exception:
                logger.exception("Failed to refund credits after tenant CI run lock")
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail=str(exc)) from exc
    except Exception:
        if (
            charged_amount is not None
            and charged_reason is not None
            and charged_project_id is not None
        ):
            try:
                refund_credits_for_project_owner(
                    db,
                    project_id=charged_project_id,
                    amount=charged_amount,
                    reason=f"refund:{charged_reason}:ci_enqueue_failed",
                )
            except Exception:
                logger.exception("Failed to refund credits after CI enqueue failure")
        raise
    return CIRunCreateResponse(run_id=run.run_id)


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
        item.strip().lower() for item in mutation_categories if isinstance(item, str) and item.strip()
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
        str(item).strip().lower()
        for item in raw_value
        if isinstance(item, str) and item.strip()
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
