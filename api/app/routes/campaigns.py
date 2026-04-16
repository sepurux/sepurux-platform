from __future__ import annotations

import logging
from typing import Annotated
from uuid import UUID

from app.auth import ProjectScope, TenantAuthContext, require_project_scope, require_role
from app.db import get_db
from app.schemas import (
    CampaignCreateRequest,
    CampaignEvalSetPatch,
    CampaignFailureBreakdownItem,
    CampaignFailureRecord,
    CampaignMetadata,
    CampaignMutationPackPatch,
    CampaignMutationSetPatch,
    CampaignReliabilityResponse,
    CampaignRunPackRequest,
    CampaignRunPackResponse,
    QualityContractResponse,
    QualityContractUpsert,
)
from app.services.audit_service import actor_from_request
from app.services.billing_service import (
    InsufficientCreditsError,
    consume_credits_for_pack_run,
    get_queue_priority_for_context,
    operation_cost_for_pack_run,
    refund_credits_for_context,
)
from app.services.campaign_service import archive_campaign, create_campaign
from app.services.campaign_service import get_campaign as get_campaign_record
from app.services.campaign_service import list_campaigns as list_campaign_records
from app.services.contract_service import (
    delete_contract,
    get_contract,
    serialize_contract,
    upsert_contract,
)
from app.services.demo_service import (
    enforce_demo_campaign_create_limit,
    enforce_demo_run_limits,
    enforce_demo_run_pack_limits,
)
from app.services.failure_service import (
    calculate_campaign_reliability,
    list_failures_for_campaign,
    serialize_failure_record,
)
from app.services.mutation_pack_service import ensure_registered_mutation_pack, get_mutation_pack
from app.services.notification_service import create_notification
from app.services.run_service import create_run_pack_and_enqueue
from app.services.tenant_control_service import (
    TenantControlViolationError,
    assert_tenant_runs_allowed,
)
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/campaigns", tags=["campaigns"])
logger = logging.getLogger(__name__)

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]
DeveloperAuth = Annotated[TenantAuthContext, Depends(require_role("developer"))]
RUN_ID_QUERY = Query(None)


def _to_campaign_metadata(campaign) -> CampaignMetadata:
    return CampaignMetadata(
        campaign_id=campaign.campaign_id,
        mutation_pack_id=campaign.mutation_pack_id,
        name=campaign.name,
        status=campaign.status,
        mutation_set=campaign.mutation_set,
        eval_set=campaign.eval_set,
        created_at=campaign.created_at,
    )


def _mutation_looks_like_pack_definition(mutation: object) -> bool:
    if not isinstance(mutation, dict):
        return False
    return any(
        key in mutation for key in ("type", "target", "params", "probability", "weight")
    )


def _ensure_replay_mutation_set(
    mutation_set: list[dict[str, object]],
    *,
    mutation_pack_id: UUID | None,
) -> None:
    if mutation_pack_id is None:
        return
    if any(_mutation_looks_like_pack_definition(item) for item in mutation_set):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Campaign mutation_set must contain replay mutations, not mutation-pack "
                "definitions"
            ),
        )


def _default_campaign_mutation_set() -> list[dict[str, str]]:
    return [{"mutation_id": "baseline"}]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=CampaignMetadata)
def post_campaign(
    payload: CampaignCreateRequest,
    db: DbSession,
    project_scope: ProjectScopeDep,
    tenant_auth: DeveloperAuth,
    request: Request,
) -> CampaignMetadata:
    if tenant_auth.is_demo:
        enforce_demo_campaign_create_limit(db, project_id=project_scope.project_id)

    if payload.mutation_pack_id is not None and (
        get_mutation_pack(
            db,
            project_id=project_scope.project_id,
            mutation_pack_id=payload.mutation_pack_id,
        )
        is None
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mutation pack not found")

    mutation_set = payload.mutation_set or _default_campaign_mutation_set()
    _ensure_replay_mutation_set(mutation_set, mutation_pack_id=payload.mutation_pack_id)

    eval_set = payload.eval_set.model_dump(mode="json", exclude_none=True, exclude_unset=True)
    campaign = create_campaign(
        db,
        project_id=project_scope.project_id,
        name=payload.name,
        mutation_set=mutation_set,
        eval_set=eval_set,
        mutation_pack_id=payload.mutation_pack_id,
        actor=actor_from_request(request),
    )
    try:
        create_notification(
            db,
            tenant_id=project_scope.tenant_id,
            project_id=project_scope.project_id,
            user_id=tenant_auth.user_id,
            event_type="campaign.created",
            severity="info",
            title="Campaign created",
            message=f"Campaign '{campaign.name}' is ready to run.",
            link_url="/campaigns",
            metadata={
                "campaign_id": str(campaign.campaign_id),
                "mutation_pack_id": (
                    str(campaign.mutation_pack_id)
                    if campaign.mutation_pack_id is not None
                    else None
                ),
            },
        )
    except Exception:
        logger.exception("Failed to create campaign notification")
    return _to_campaign_metadata(campaign)


@router.get("", response_model=list[CampaignMetadata])
def get_campaigns(
    db: DbSession,
    project_scope: ProjectScopeDep,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    include_archived: bool = Query(False),
) -> list[CampaignMetadata]:
    records = list_campaign_records(
        db,
        project_id=project_scope.project_id,
        limit=limit,
        offset=offset,
        include_archived=include_archived,
    )
    return [_to_campaign_metadata(record) for record in records]


@router.get("/{campaign_id}", response_model=CampaignMetadata)
def get_campaign(
    campaign_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
    include_archived: bool = Query(False),
) -> CampaignMetadata:
    campaign = get_campaign_record(
        db,
        project_id=project_scope.project_id,
        campaign_id=campaign_id,
        include_archived=include_archived,
    )
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return _to_campaign_metadata(campaign)


@router.patch("/{campaign_id}/eval-set", response_model=CampaignMetadata)
def patch_campaign_eval_set(
    campaign_id: UUID,
    payload: CampaignEvalSetPatch,
    db: DbSession,
    project_scope: ProjectScopeDep,
    tenant_auth: DeveloperAuth,
) -> CampaignMetadata:
    """Add/remove trace IDs and update min_scenarios in a campaign's eval set."""
    del tenant_auth
    campaign = get_campaign_record(db, project_id=project_scope.project_id, campaign_id=campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    eval_set = dict(campaign.eval_set) if isinstance(campaign.eval_set, dict) else {}
    existing_ids: list[str] = eval_set.get("trace_ids") or []
    if not isinstance(existing_ids, list):
        existing_ids = []

    add_ids = {str(t) for t in payload.add_trace_ids}
    remove_ids = {str(t) for t in payload.remove_trace_ids}
    updated_ids = [t for t in existing_ids if t not in remove_ids]
    for tid in add_ids:
        if tid not in updated_ids:
            updated_ids.append(tid)

    eval_set["trace_ids"] = updated_ids
    if payload.min_scenarios is not None:
        eval_set["min_scenarios"] = payload.min_scenarios
    if payload.attempts_count is not None:
        eval_set["attempts_count"] = payload.attempts_count

    campaign.eval_set = eval_set
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _to_campaign_metadata(campaign)


@router.patch("/{campaign_id}/mutation-set", response_model=CampaignMetadata)
def patch_campaign_mutation_set(
    campaign_id: UUID,
    payload: CampaignMutationSetPatch,
    db: DbSession,
    project_scope: ProjectScopeDep,
    tenant_auth: DeveloperAuth,
) -> CampaignMetadata:
    del tenant_auth
    campaign = get_campaign_record(db, project_id=project_scope.project_id, campaign_id=campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    _ensure_replay_mutation_set(payload.mutation_set, mutation_pack_id=campaign.mutation_pack_id)

    campaign.mutation_set = payload.mutation_set
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _to_campaign_metadata(campaign)


@router.patch("/{campaign_id}/mutation-pack", response_model=CampaignMetadata)
def patch_campaign_mutation_pack(
    campaign_id: UUID,
    payload: CampaignMutationPackPatch,
    db: DbSession,
    project_scope: ProjectScopeDep,
    tenant_auth: DeveloperAuth,
) -> CampaignMetadata:
    del tenant_auth
    campaign = get_campaign_record(db, project_id=project_scope.project_id, campaign_id=campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    if payload.mutation_pack_id is not None and (
        get_mutation_pack(
            db,
            project_id=project_scope.project_id,
            mutation_pack_id=payload.mutation_pack_id,
        )
        is None
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mutation pack not found")

    campaign.mutation_pack_id = payload.mutation_pack_id
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _to_campaign_metadata(campaign)



@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign(
    campaign_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
    tenant_auth: DeveloperAuth,
    request: Request,
) -> Response:
    del tenant_auth
    archived = archive_campaign(
        db,
        project_id=project_scope.project_id,
        campaign_id=campaign_id,
        actor=actor_from_request(request),
    )
    if archived is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{campaign_id}/failures", response_model=list[CampaignFailureRecord])
def get_campaign_failures(
    campaign_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
    run_id: UUID | None = RUN_ID_QUERY,
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[CampaignFailureRecord]:
    campaign = get_campaign_record(db, project_id=project_scope.project_id, campaign_id=campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    failures = list_failures_for_campaign(
        db,
        project_id=project_scope.project_id,
        campaign_id=campaign_id,
        run_id=run_id,
        limit=limit,
        offset=offset,
    )
    return [CampaignFailureRecord(**serialize_failure_record(failure)) for failure in failures]


@router.get("/{campaign_id}/reliability", response_model=CampaignReliabilityResponse)
def get_campaign_reliability(
    campaign_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
    run_id: UUID | None = RUN_ID_QUERY,
) -> CampaignReliabilityResponse:
    campaign = get_campaign_record(db, project_id=project_scope.project_id, campaign_id=campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    reliability = calculate_campaign_reliability(
        db,
        project_id=project_scope.project_id,
        campaign_id=campaign_id,
        run_id=run_id,
    )
    return CampaignReliabilityResponse(
        reliability_score=reliability["reliability_score"],
        status=reliability["status"],
        classified_failures=reliability["classified_failures"],
        failure_breakdown=[
            CampaignFailureBreakdownItem(**item) for item in reliability["failure_breakdown"]
        ],
    )


@router.post(
    "/{campaign_id}/run-pack",
    status_code=status.HTTP_201_CREATED,
    response_model=CampaignRunPackResponse,
)
def post_campaign_run_pack(
    campaign_id: UUID,
    payload: CampaignRunPackRequest,
    db: DbSession,
    project_scope: ProjectScopeDep,
    tenant_auth: DeveloperAuth,
    request: Request,
) -> CampaignRunPackResponse:
    charged_amount: int | None = None
    charged_reason: str | None = None

    try:
        assert_tenant_runs_allowed(db, tenant_id=project_scope.tenant_id)
    except TenantControlViolationError as exc:
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail=str(exc)) from exc

    campaign = get_campaign_record(db, project_id=project_scope.project_id, campaign_id=campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    mutation_pack = ensure_registered_mutation_pack(
        db,
        project_id=project_scope.project_id,
        pack_name=payload.pack.strip(),
    )
    if mutation_pack is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mutation pack not found")

    config = mutation_pack.config if isinstance(mutation_pack.config, dict) else {}
    mutations = config.get("mutations")
    mutation_count = len(mutations) if isinstance(mutations, list) else 0

    if tenant_auth.is_demo:
        enforce_demo_run_limits(
            db,
            project_id=project_scope.project_id,
            campaign=campaign,
        )
        enforce_demo_run_pack_limits(
            pack_name=mutation_pack.name,
            mutation_count=mutation_count,
        )
    else:
        try:
            charged_amount, charged_reason = operation_cost_for_pack_run(
                mutation_pack=mutation_pack
            )
            consume_credits_for_pack_run(
                db,
                tenant_auth=tenant_auth,
                project_id=project_scope.project_id,
                mutation_pack=mutation_pack,
            )
        except InsufficientCreditsError as exc:
            try:
                create_notification(
                    db,
                    tenant_id=project_scope.tenant_id,
                    project_id=project_scope.project_id,
                    user_id=tenant_auth.user_id,
                    event_type="credits.insufficient",
                    severity="warning",
                    title="Run blocked: insufficient credits",
                    message=(
                        f"Pack run for '{mutation_pack.name}' was blocked because available "
                        "credits are too low."
                    ),
                    link_url="/billing",
                    metadata={
                        "campaign_id": str(campaign.campaign_id),
                        "mutation_pack_id": str(mutation_pack.mutation_pack_id),
                    },
                )
            except Exception:
                logger.exception("Failed to create pack-run insufficient-credits notification")
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=str(exc)
            ) from exc

    queue_priority = get_queue_priority_for_context(
        db,
        tenant_auth=tenant_auth,
        project_id=project_scope.project_id,
    )

    try:
        run = create_run_pack_and_enqueue(
            db,
            project_id=project_scope.project_id,
            campaign=campaign,
            mutation_pack=mutation_pack,
            queue_priority=queue_priority,
            actor=actor_from_request(request),
        )
    except TenantControlViolationError as exc:
        if charged_amount is not None and charged_reason is not None:
            try:
                refund_credits_for_context(
                    db,
                    tenant_auth=tenant_auth,
                    project_id=project_scope.project_id,
                    amount=charged_amount,
                    reason=f"refund:{charged_reason}:tenant_runs_paused",
                )
            except Exception:
                logger.exception("Failed to refund credits after tenant run lock")
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail=str(exc)) from exc
    except Exception:
        if charged_amount is not None and charged_reason is not None:
            try:
                refund_credits_for_context(
                    db,
                    tenant_auth=tenant_auth,
                    project_id=project_scope.project_id,
                    amount=charged_amount,
                    reason=f"refund:{charged_reason}:run_pack_enqueue_failed",
                )
            except Exception:
                logger.exception("Failed to refund credits after run-pack enqueue failure")
        raise

    try:
        create_notification(
            db,
            tenant_id=project_scope.tenant_id,
            project_id=project_scope.project_id,
            user_id=tenant_auth.user_id,
            event_type="run.pack_queued",
            severity="info",
            title="Mutation pack run queued",
            message=(
                f"Campaign '{campaign.name}' was queued with mutation pack '{mutation_pack.name}'."
            ),
            link_url=f"/runs/{run.run_id}",
            metadata={
                "run_id": str(run.run_id),
                "campaign_id": str(run.campaign_id),
                "mutation_pack_id": str(mutation_pack.mutation_pack_id),
            },
        )
    except Exception:
        logger.exception("Failed to create run-pack notification")

    return CampaignRunPackResponse(
        run_id=run.run_id,
        trace_id=run.trace_id,
        campaign_id=run.campaign_id,
        mutation_pack_id=mutation_pack.mutation_pack_id,
        mutation_pack=mutation_pack.name,
        status=run.status,
        created_at=run.created_at,
    )


# ─── Quality Contract ──────────────────────────────────────────────────────────


@router.get("/{campaign_id}/contract", response_model=QualityContractResponse)
def get_campaign_contract(
    campaign_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
) -> QualityContractResponse:
    contract = get_contract(db, campaign_id=campaign_id)
    if contract is None or contract.project_id != project_scope.project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No contract defined")
    return serialize_contract(contract)


@router.put("/{campaign_id}/contract", response_model=QualityContractResponse)
def put_campaign_contract(
    campaign_id: UUID,
    payload: QualityContractUpsert,
    db: DbSession,
    project_scope: ProjectScopeDep,
) -> QualityContractResponse:
    from app.models import Campaign
    from sqlalchemy import select as _select

    campaign = db.scalar(
        _select(Campaign).where(
            Campaign.campaign_id == campaign_id,
            Campaign.project_id == project_scope.project_id,
        )
    )
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    contract = upsert_contract(
        db,
        project_id=project_scope.project_id,
        campaign_id=campaign_id,
        required_pack_ids=payload.required_pack_ids,
        required_tools=payload.required_tools,
        min_attempts_per_pack=payload.min_attempts_per_pack,
    )
    db.commit()
    db.refresh(contract)
    return serialize_contract(contract)


@router.delete("/{campaign_id}/contract", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign_contract(
    campaign_id: UUID,
    db: DbSession,
    project_scope: ProjectScopeDep,
) -> Response:
    contract = get_contract(db, campaign_id=campaign_id)
    if contract is None or contract.project_id != project_scope.project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No contract defined")
    delete_contract(db, campaign_id=campaign_id)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
