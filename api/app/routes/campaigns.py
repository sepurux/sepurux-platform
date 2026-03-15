from __future__ import annotations

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
    get_queue_priority_for_context,
    maybe_consume_credits_for_campaign_run,
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
from app.services.run_service import create_run_pack_and_enqueue
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/campaigns", tags=["campaigns"])

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
            maybe_consume_credits_for_campaign_run(
                db,
                tenant_auth=tenant_auth,
                project_id=project_scope.project_id,
                campaign=campaign,
            )
        except InsufficientCreditsError as exc:
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=str(exc)) from exc

    queue_priority = get_queue_priority_for_context(
        db,
        tenant_auth=tenant_auth,
        project_id=project_scope.project_id,
    )

    run = create_run_pack_and_enqueue(
        db,
        project_id=project_scope.project_id,
        campaign=campaign,
        mutation_pack=mutation_pack,
        queue_priority=queue_priority,
        actor=actor_from_request(request),
    )
    return CampaignRunPackResponse(
        run_id=run.run_id,
        trace_id=run.trace_id,
        campaign_id=run.campaign_id,
        mutation_pack_id=mutation_pack.mutation_pack_id,
        mutation_pack=mutation_pack.name,
        status=run.status,
        created_at=run.created_at,
    )
