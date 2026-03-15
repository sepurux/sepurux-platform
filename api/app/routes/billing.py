from __future__ import annotations

from typing import Annotated

from app.auth import (
    ProjectScope,
    TenantAuthContext,
    get_tenant_auth,
    require_permission,
    require_project_scope,
)
from app.db import get_db
from app.schemas import (
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
    serialize_user_subscription,
    subscribe_user,
    topup_credits,
)
from fastapi import APIRouter, Depends, HTTPException, status
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
) -> tuple[object, object, object, object]:
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


@router.post("/subscribe", response_model=UserSubscriptionMetadata)
def post_billing_subscribe(
    payload: BillingSubscribeRequest,
    db: DbSession,
    project_scope: BillingManageScope,
    tenant_auth: TenantAuthDep,
) -> UserSubscriptionMetadata:
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
    try:
        subscription, _, plan = subscribe_user(
            db,
            user_id=user_id,
            plan_id=payload.plan_id,
            tenant_id=project_scope.tenant_id,
        )
    except BillingSubjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return UserSubscriptionMetadata(**serialize_user_subscription(subscription, plan=plan))


@router.post("/topup", response_model=CreditWalletMetadata)
def post_billing_topup(
    payload: BillingTopupRequest,
    db: DbSession,
    project_scope: BillingManageScope,
    tenant_auth: TenantAuthDep,
) -> CreditWalletMetadata:
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
    wallet = topup_credits(db, user_id=user_id, credits=payload.credits)
    _, wallet_payload, _, _ = _resolve_billable_user_or_404(
        db,
        tenant_auth=tenant_auth,
        project_scope=project_scope,
    )
    _ = wallet
    return CreditWalletMetadata(**wallet_payload)
