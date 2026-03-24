from __future__ import annotations

import logging
from typing import Annotated
from uuid import UUID

from app.auth import ProjectScope, TenantAuthContext, require_project_scope, require_role
from app.db import get_db
from app.schemas import (
    CampaignCreateRequest,
    CampaignFailureBreakdownItem,
    CampaignFailureRecord,
    CampaignMetadata,
    CampaignReliabilityResponse,
    CampaignRunPackRequest,
    CampaignRunPackResponse,
)
from app.services.audit_service import actor_from_request
from app.services.billing_service import (
    InsufficientCreditsError,
    consume_credits_for_pack_run,
    get_queue_priority_for_context,
    operation_cost_for_pack_run,
    refund_credits_for_context,
)
from app.services.campaign_service import create_campaign
from app.services.campaign_service import get_campaign as get_campaign_record
from app.services.campaign_service import list_campaigns as list_campaign_records
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
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/campaigns", tags=["campaigns"])
logger = logging.getLogger(__name__)

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]
DeveloperAuth = Annotated[TenantAuthContext, Depends(require_role("developer"))]
PACK_DEFINITION_KEYS = frozenset({"target", "params", "probability", "weight"})
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


def _looks_like_pack_definition(item: object) -> bool:
    return isinstance(item, dict) and bool(PACK_DEFINITION_KEYS.intersection(item))


def _mutation_set_contains_pack_definitions(mutation_set: object) -> bool:
    if isinstance(mutation_set, list):
        return any(_looks_like_pack_definition(item) for item in mutation_set)
    if isinstance(mutation_set, dict):
        nested_mutations = mutation_set.get("mutations")
        if isinstance(nested_mutations, list):
            return any(_looks_like_pack_definition(item) for item in nested_mutations)
        return _looks_like_pack_definition(mutation_set)
    return False


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

    if payload.mutation_pack_id is not None and _mutation_set_contains_pack_definitions(
        payload.mutation_set
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Campaign mutation_set must contain replay mutations, not mutation-pack "
                "definitions"
            ),
        )

    campaign = create_campaign(
        db,
        project_id=project_scope.project_id,
        name=payload.name,
        mutation_set=payload.mutation_set,
        eval_set=payload.eval_set,
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
                    str(campaign.mutation_pack_id) if campaign.mutation_pack_id is not None else None
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
) -> list[CampaignMetadata]:
    records = list_campaign_records(
        db,
        project_id=project_scope.project_id,
        limit=limit,
        offset=offset,
    )
    return [_to_campaign_metadata(record) for record in records]


@router.get("/{campaign_id}", response_model=CampaignMetadata)
def get_campaign(
    campaign_id: UUID, db: DbSession, project_scope: ProjectScopeDep
) -> CampaignMetadata:
    campaign = get_campaign_record(db, project_id=project_scope.project_id, campaign_id=campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return _to_campaign_metadata(campaign)


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
