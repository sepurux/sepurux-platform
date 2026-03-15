from __future__ import annotations

from typing import Annotated, Any

from app.auth import (
    ProjectScope,
    TenantAuthContext,
    get_tenant_auth,
    require_permission,
    require_project_scope,
)
from app.db import get_db
from app.schemas import (
    BillingRedirectSessionResponse,
    BillingSubscribeRequest,
    BillingTopupRequest,
    CreditWalletMetadata,
    SubscriptionPlanMetadata,
    UserSubscriptionMetadata,
)
from app.services.billing_service import (
    BillingSubjectNotFoundError,
    get_billing_snapshot_for_context,
    list_subscription_plans,
    resolve_billable_user_id,
    serialize_subscription_plan,
)
from app.services.stripe_billing_service import (
    create_billing_portal_redirect,
    create_subscription_billing_redirect,
    create_topup_billing_redirect,
    process_stripe_webhook,
)
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/v1/billing", tags=["billing"])

DbSession = Annotated[Session, Depends(get_db)]
ProjectScopeDep = Annotated[ProjectScope, Depends(require_project_scope)]
TenantAuthDep = Annotated[TenantAuthContext, Depends(get_tenant_auth)]
BillingManageScope = Annotated[
    ProjectScope,
    Depends(require_permission("can_manage_billing", section_name="billing")),
]


def _resolve_billable_user_or_404(
    db: Session,
    *,
    tenant_auth: TenantAuthContext,
    project_scope: ProjectScope,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], dict[str, Any]]:
    billing_snapshot = get_billing_snapshot_for_context(
        db,
        tenant_auth=tenant_auth,
        project_id=project_scope.project_id,
    )
    if not isinstance(billing_snapshot, dict):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Billing wallet not found for this session",
        )
    subscription = billing_snapshot.get("subscription")
    wallet = billing_snapshot.get("wallet")
    plan = billing_snapshot.get("plan")
    if (
        not isinstance(subscription, dict)
        or not isinstance(wallet, dict)
        or not isinstance(plan, dict)
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Billing wallet not found for this session",
        )
    return subscription, wallet, plan, billing_snapshot


@router.get("/plans", response_model=list[SubscriptionPlanMetadata])
def get_billing_plans(
    db: DbSession,
    project_scope: ProjectScopeDep,
) -> list[SubscriptionPlanMetadata]:
    _ = project_scope
    return [
        SubscriptionPlanMetadata(**serialize_subscription_plan(plan))
        for plan in list_subscription_plans(db)
    ]


@router.get("/subscription", response_model=UserSubscriptionMetadata)
def get_billing_subscription(
    db: DbSession,
    project_scope: ProjectScopeDep,
    tenant_auth: TenantAuthDep,
) -> UserSubscriptionMetadata:
    subscription, _, _, _ = _resolve_billable_user_or_404(
        db,
        tenant_auth=tenant_auth,
        project_scope=project_scope,
    )
    return UserSubscriptionMetadata(**subscription)


@router.get("/credits", response_model=CreditWalletMetadata)
def get_billing_credits(
    db: DbSession,
    project_scope: ProjectScopeDep,
    tenant_auth: TenantAuthDep,
) -> CreditWalletMetadata:
    _, wallet, _, _ = _resolve_billable_user_or_404(
        db,
        tenant_auth=tenant_auth,
        project_scope=project_scope,
    )
    return CreditWalletMetadata(**wallet)


@router.post("/subscribe", response_model=BillingRedirectSessionResponse)
def post_billing_subscribe(
    payload: BillingSubscribeRequest,
    db: DbSession,
    project_scope: BillingManageScope,
    tenant_auth: TenantAuthDep,
) -> BillingRedirectSessionResponse:
    user_id = resolve_billable_user_id(
        db,
        tenant_auth=tenant_auth,
        project_id=project_scope.project_id,
    )
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Billing user not found for this session",
        )
    _resolve_billable_user_or_404(
        db,
        tenant_auth=tenant_auth,
        project_scope=project_scope,
    )
    try:
        redirect = create_subscription_billing_redirect(
            db,
            user_id=user_id,
            project_id=project_scope.project_id,
            tenant_id=project_scope.tenant_id,
            plan_id=payload.plan_id,
        )
    except BillingSubjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return BillingRedirectSessionResponse(**redirect)


@router.post("/topup", response_model=BillingRedirectSessionResponse)
def post_billing_topup(
    payload: BillingTopupRequest,
    db: DbSession,
    project_scope: BillingManageScope,
    tenant_auth: TenantAuthDep,
) -> BillingRedirectSessionResponse:
    user_id = resolve_billable_user_id(
        db,
        tenant_auth=tenant_auth,
        project_id=project_scope.project_id,
    )
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Billing user not found for this session",
        )
    _resolve_billable_user_or_404(
        db,
        tenant_auth=tenant_auth,
        project_scope=project_scope,
    )
    redirect = create_topup_billing_redirect(
        db,
        user_id=user_id,
        project_id=project_scope.project_id,
        tenant_id=project_scope.tenant_id,
        credits=payload.credits,
    )
    return BillingRedirectSessionResponse(**redirect)


@router.post("/portal", response_model=BillingRedirectSessionResponse)
def post_billing_portal(
    db: DbSession,
    project_scope: BillingManageScope,
    tenant_auth: TenantAuthDep,
) -> BillingRedirectSessionResponse:
    user_id = resolve_billable_user_id(
        db,
        tenant_auth=tenant_auth,
        project_id=project_scope.project_id,
    )
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Billing user not found for this session",
        )
    redirect = create_billing_portal_redirect(db, user_id=user_id)
    return BillingRedirectSessionResponse(**redirect)


@router.post("/webhook", include_in_schema=False)
async def post_billing_webhook(
    request: Request,
    db: DbSession,
) -> dict[str, str]:
    payload = await request.body()
    signature_header = request.headers.get("stripe-signature")
    result = process_stripe_webhook(
        db,
        payload=payload,
        signature_header=signature_header,
    )
    return {key: str(value) for key, value in result.items()}
