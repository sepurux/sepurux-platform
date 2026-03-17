from __future__ import annotations

import os
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import stripe
from app.models import Project, SubscriptionPlan, Tenant, User
from app.services.billing_service import (
    STRIPE_PROVIDER,
    apply_subscription_cycle_grant,
    cancel_user_subscription,
    get_subscription_plan,
    get_user_subscription,
    get_user_subscription_by_stripe_subscription_id,
    has_processed_billing_webhook_event,
    mark_billing_webhook_event_processed,
    self_serve_checkout_enabled_for_plan,
    subscribe_user,
    topup_credits,
)
from app.services.pricing_service import DEFAULT_PRICING_TIER, normalize_pricing_tier
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

STRIPE_PRICE_ENV_BY_PLAN_NAME = {
    "Pro": "STRIPE_PRICE_PRO_MONTHLY",
    "Team": "STRIPE_PRICE_TEAM_MONTHLY",
    "Enterprise": "STRIPE_PRICE_ENTERPRISE_MONTHLY",
}


def _normalize_url(url: str) -> str:
    return url[:-1] if url.endswith("/") else url


def _billing_base_url() -> str:
    raw = os.getenv("SEPURUX_UI_BASE_URL") or os.getenv("APP_PUBLIC_URL") or "http://localhost:3000"
    return _normalize_url(raw)


def _checkout_success_url() -> str:
    return f"{_billing_base_url()}/profile?checkout=success&session_id={{CHECKOUT_SESSION_ID}}"


def _checkout_cancel_url() -> str:
    return f"{_billing_base_url()}/profile?checkout=cancelled"


def _billing_return_url() -> str:
    return f"{_billing_base_url()}/billing"


def _stripe_secret_key() -> str:
    value = os.getenv("STRIPE_SECRET_KEY")
    if isinstance(value, str) and value.strip():
        return value.strip()
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Stripe billing is not configured",
    )


def _stripe_webhook_secret() -> str:
    value = os.getenv("STRIPE_WEBHOOK_SECRET")
    if isinstance(value, str) and value.strip():
        return value.strip()
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Stripe webhook secret is not configured",
    )


def _stripe_currency() -> str:
    return os.getenv("STRIPE_CURRENCY", "usd").strip().lower()


def _topup_cents_per_credit() -> int:
    raw = os.getenv("STRIPE_TOPUP_CENTS_PER_CREDIT", "1").strip()
    try:
        value = int(raw)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid STRIPE_TOPUP_CENTS_PER_CREDIT configuration",
        ) from exc
    if value <= 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="STRIPE_TOPUP_CENTS_PER_CREDIT must be greater than zero",
        )
    return value


def _stripe_price_id_for_plan(plan: SubscriptionPlan) -> str | None:
    env_name = STRIPE_PRICE_ENV_BY_PLAN_NAME.get(plan.name)
    if env_name is None:
        return None
    value = os.getenv(env_name)
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _plan_for_stripe_price_id(
    db: Session, *, stripe_price_id: str | None
) -> SubscriptionPlan | None:
    if not stripe_price_id:
        return None
    for plan in [
        get_subscription_plan(db, name="Pro"),
        get_subscription_plan(db, name="Team"),
        get_subscription_plan(db, name="Enterprise"),
    ]:
        if (
            isinstance(plan, SubscriptionPlan)
            and _stripe_price_id_for_plan(plan) == stripe_price_id
        ):
            return plan
    return None


def _coerce_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _coerce_int(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _timestamp_to_utc(value: Any) -> datetime | None:
    parsed = _coerce_int(value)
    if parsed is None or parsed <= 0:
        return None
    return datetime.fromtimestamp(parsed, tz=UTC)


def _object_get(source: Any, key: str, default: Any = None) -> Any:
    if isinstance(source, dict):
        return source.get(key, default)
    getter = getattr(source, "get", None)
    if callable(getter):
        return getter(key, default)
    return getattr(source, key, default)


def _subscription_price_id(subscription_payload: Any) -> str | None:
    items = _object_get(subscription_payload, "items")
    data = _object_get(items, "data", [])
    if isinstance(data, list) and data:
        price = _object_get(data[0], "price")
        return _coerce_str(_object_get(price, "id"))
    return None


def _resolve_user(db: Session, *, user_id: UUID) -> User:
    user = db.scalar(select(User).where(User.user_id == user_id))
    if not isinstance(user, User):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Billing user not found for this session",
        )
    return user


def _project_pricing_tier(db: Session, *, project_id: Any) -> str:
    try:
        parsed_project_id = UUID(str(project_id))
    except (TypeError, ValueError):
        return DEFAULT_PRICING_TIER

    project = db.scalar(select(Project).where(Project.project_id == parsed_project_id))
    if not isinstance(project, Project):
        return DEFAULT_PRICING_TIER

    tenant = db.scalar(select(Tenant).where(Tenant.tenant_id == project.tenant_id))
    if not isinstance(tenant, Tenant):
        return DEFAULT_PRICING_TIER
    return normalize_pricing_tier(tenant.pricing_tier)


def create_billing_portal_redirect(
    db: Session,
    *,
    user_id: UUID,
) -> dict[str, Any]:
    subscription = get_user_subscription(db, user_id=user_id)
    if subscription is None or not subscription.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No Stripe-managed subscription is available for this workspace",
        )

    stripe.api_key = _stripe_secret_key()
    session = stripe.billing_portal.Session.create(
        customer=subscription.stripe_customer_id,
        return_url=_billing_return_url(),
    )
    return {
        "provider": STRIPE_PROVIDER,
        "flow": "portal",
        "url": session.url,
        "session_id": getattr(session, "id", None),
    }


def create_subscription_billing_redirect(
    db: Session,
    *,
    user_id: UUID,
    project_id: UUID,
    tenant_id: UUID,
    plan_id: UUID,
) -> dict[str, Any]:
    user = _resolve_user(db, user_id=user_id)
    plan = get_subscription_plan(db, plan_id=plan_id)
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Subscription plan not found"
        )

    current_subscription = get_user_subscription(db, user_id=user_id)
    if current_subscription is not None and current_subscription.stripe_subscription_id:
        return create_billing_portal_redirect(db, user_id=user_id)

    if not self_serve_checkout_enabled_for_plan(plan):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This plan is not available for self-serve checkout",
        )

    stripe.api_key = _stripe_secret_key()
    price_id = _stripe_price_id_for_plan(plan)
    if price_id is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Stripe price is not configured for this plan",
        )

    metadata = {
        "operation": "subscribe",
        "user_id": str(user_id),
        "project_id": str(project_id),
        "tenant_id": str(tenant_id),
        "plan_id": str(plan_id),
    }
    session_params: dict[str, Any] = {
        "success_url": _checkout_success_url(),
        "cancel_url": _checkout_cancel_url(),
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "client_reference_id": str(user_id),
        "metadata": metadata,
        "subscription_data": {"metadata": metadata},
        "allow_promotion_codes": True,
    }
    if current_subscription is not None and current_subscription.stripe_customer_id:
        session_params["customer"] = current_subscription.stripe_customer_id
    else:
        session_params["customer_email"] = user.email

    session = stripe.checkout.Session.create(**session_params)
    return {
        "provider": STRIPE_PROVIDER,
        "flow": "checkout",
        "url": session.url,
        "session_id": session.id,
    }


def create_topup_billing_redirect(
    db: Session,
    *,
    user_id: UUID,
    project_id: UUID,
    tenant_id: UUID,
    credits: int,
) -> dict[str, Any]:
    if credits <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Credits must be greater than zero",
        )

    user = _resolve_user(db, user_id=user_id)
    current_subscription = get_user_subscription(db, user_id=user_id)
    stripe.api_key = _stripe_secret_key()
    session_params: dict[str, Any] = {
        "success_url": _checkout_success_url(),
        "cancel_url": _checkout_cancel_url(),
        "mode": "payment",
        "line_items": [
            {
                "price_data": {
                    "currency": _stripe_currency(),
                    "product_data": {
                        "name": "Sepurux credit top-up",
                        "description": f"{credits:,} credits for replay and mutation runs",
                    },
                    "unit_amount": credits * _topup_cents_per_credit(),
                },
                "quantity": 1,
            }
        ],
        "client_reference_id": str(user_id),
        "metadata": {
            "operation": "topup",
            "user_id": str(user_id),
            "project_id": str(project_id),
            "tenant_id": str(tenant_id),
            "credits": str(credits),
        },
    }
    if current_subscription is not None and current_subscription.stripe_customer_id:
        session_params["customer"] = current_subscription.stripe_customer_id
    else:
        session_params["customer_email"] = user.email

    session = stripe.checkout.Session.create(**session_params)
    return {
        "provider": STRIPE_PROVIDER,
        "flow": "checkout",
        "url": session.url,
        "session_id": session.id,
    }


def construct_stripe_event(*, payload: bytes, signature_header: str | None) -> Any:
    if not signature_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Stripe-Signature header",
        )
    try:
        return stripe.Webhook.construct_event(
            payload=payload,
            sig_header=signature_header,
            secret=_stripe_webhook_secret(),
        )
    except stripe.SignatureVerificationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Stripe webhook signature",
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Stripe webhook payload",
        ) from exc


def _retrieve_subscription(subscription_id: str | None) -> Any:
    if not subscription_id:
        return None
    stripe.api_key = _stripe_secret_key()
    try:
        return stripe.Subscription.retrieve(subscription_id)
    except stripe.StripeError:
        return None


def _handle_checkout_session_completed(db: Session, session_payload: Any) -> None:
    mode = _coerce_str(_object_get(session_payload, "mode"))
    metadata = _object_get(session_payload, "metadata", {}) or {}
    if not isinstance(metadata, dict):
        metadata = {}
    operation = _coerce_str(metadata.get("operation"))
    if operation == "topup" and mode == "payment":
        if _coerce_str(_object_get(session_payload, "payment_status")) not in {
            "paid",
            "no_payment_required",
        }:
            return
        user_id_raw = metadata.get("user_id")
        project_id_raw = metadata.get("project_id")
        credits_raw = metadata.get("credits")
        if user_id_raw is None or credits_raw is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Missing top-up metadata"
            )
        topup_credits(
            db,
            user_id=UUID(str(user_id_raw)),
            credits=int(str(credits_raw)),
            pricing_tier=_project_pricing_tier(db, project_id=project_id_raw),
            reason=f"stripe top-up checkout {_coerce_str(_object_get(session_payload, 'id')) or 'session'}",
        )
        return

    if operation != "subscribe" or mode != "subscription":
        return

    user_id_raw = metadata.get("user_id")
    plan_id_raw = metadata.get("plan_id")
    tenant_id_raw = metadata.get("tenant_id")
    if user_id_raw is None or plan_id_raw is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing subscription checkout metadata",
        )

    plan = get_subscription_plan(db, plan_id=UUID(str(plan_id_raw)))
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Subscription plan not found"
        )

    subscribe_user(
        db,
        user_id=UUID(str(user_id_raw)),
        plan_id=plan.plan_id,
        tenant_id=UUID(str(tenant_id_raw)) if tenant_id_raw else None,
        stripe_customer_id=_coerce_str(_object_get(session_payload, "customer")),
        stripe_subscription_id=_coerce_str(_object_get(session_payload, "subscription")),
        stripe_price_id=_stripe_price_id_for_plan(plan),
        ensure_minimum_monthly_credits=plan.monthly_credits,
        transaction_reason=f"stripe checkout activation ({plan.name})",
    )


def _handle_invoice_paid(db: Session, invoice_payload: Any) -> None:
    billing_reason = _coerce_str(_object_get(invoice_payload, "billing_reason"))
    stripe_subscription_id = _coerce_str(_object_get(invoice_payload, "subscription"))
    if stripe_subscription_id is None:
        return

    local_subscription = get_user_subscription_by_stripe_subscription_id(
        db,
        stripe_subscription_id=stripe_subscription_id,
    )
    stripe_subscription = _retrieve_subscription(stripe_subscription_id)
    metadata = _object_get(stripe_subscription, "metadata", {}) or {}
    if not isinstance(metadata, dict):
        metadata = {}

    user_id_raw = metadata.get("user_id")
    tenant_id_raw = metadata.get("tenant_id")
    price_id = _subscription_price_id(stripe_subscription)
    plan = _plan_for_stripe_price_id(db, stripe_price_id=price_id)
    if plan is None and local_subscription is not None:
        plan = get_subscription_plan(db, plan_id=local_subscription.plan_id)
    if plan is None:
        return

    renewal_date = _timestamp_to_utc(_object_get(stripe_subscription, "current_period_end"))
    if renewal_date is None:
        renewal_date = _timestamp_to_utc(
            _object_get(invoice_payload, "period_end")
        ) or datetime.now(UTC)

    if local_subscription is None and user_id_raw is not None:
        subscription, _, _ = subscribe_user(
            db,
            user_id=UUID(str(user_id_raw)),
            plan_id=plan.plan_id,
            tenant_id=UUID(str(tenant_id_raw)) if tenant_id_raw else None,
            stripe_customer_id=_coerce_str(_object_get(stripe_subscription, "customer")),
            stripe_subscription_id=stripe_subscription_id,
            stripe_price_id=price_id,
            ensure_minimum_monthly_credits=plan.monthly_credits,
            transaction_reason=f"stripe invoice activation ({plan.name})",
        )
        local_subscription = subscription

    if local_subscription is None:
        return

    local_subscription.plan_id = plan.plan_id
    local_subscription.status = "active"
    local_subscription.stripe_customer_id = _coerce_str(
        _object_get(stripe_subscription, "customer")
    )
    local_subscription.stripe_subscription_id = stripe_subscription_id
    local_subscription.stripe_price_id = price_id

    if billing_reason == "subscription_cycle":
        apply_subscription_cycle_grant(
            db,
            subscription=local_subscription,
            plan=plan,
            renewal_date=renewal_date,
            reason=f"stripe invoice paid renewal ({plan.name})",
        )
        return

    local_subscription.renewal_date = renewal_date
    db.add(local_subscription)
    db.commit()


def _handle_customer_subscription_updated(db: Session, subscription_payload: Any) -> None:
    stripe_subscription_id = _coerce_str(_object_get(subscription_payload, "id"))
    if stripe_subscription_id is None:
        return

    local_subscription = get_user_subscription_by_stripe_subscription_id(
        db,
        stripe_subscription_id=stripe_subscription_id,
    )
    if local_subscription is None:
        return

    metadata = _object_get(subscription_payload, "metadata", {}) or {}
    if not isinstance(metadata, dict):
        metadata = {}
    tenant_id_raw = metadata.get("tenant_id")
    price_id = _subscription_price_id(subscription_payload)
    plan = _plan_for_stripe_price_id(db, stripe_price_id=price_id)
    if plan is not None:
        local_subscription.plan_id = plan.plan_id

    local_subscription.status = _coerce_str(_object_get(subscription_payload, "status")) or "active"
    local_subscription.stripe_customer_id = _coerce_str(
        _object_get(subscription_payload, "customer")
    )
    local_subscription.stripe_subscription_id = stripe_subscription_id
    local_subscription.stripe_price_id = price_id
    renewal_date = _timestamp_to_utc(_object_get(subscription_payload, "current_period_end"))
    if renewal_date is not None:
        local_subscription.renewal_date = renewal_date
    db.add(local_subscription)

    if plan is not None and tenant_id_raw:
        subscribe_user(
            db,
            user_id=local_subscription.user_id,
            plan_id=plan.plan_id,
            tenant_id=UUID(str(tenant_id_raw)),
            stripe_customer_id=local_subscription.stripe_customer_id,
            stripe_subscription_id=stripe_subscription_id,
            stripe_price_id=price_id,
        )
        return

    db.commit()


def _handle_customer_subscription_deleted(db: Session, subscription_payload: Any) -> None:
    stripe_subscription_id = _coerce_str(_object_get(subscription_payload, "id"))
    if stripe_subscription_id is None:
        return

    local_subscription = get_user_subscription_by_stripe_subscription_id(
        db,
        stripe_subscription_id=stripe_subscription_id,
    )
    if local_subscription is None:
        return

    metadata = _object_get(subscription_payload, "metadata", {}) or {}
    if not isinstance(metadata, dict):
        metadata = {}
    tenant_id_raw = metadata.get("tenant_id")
    cancel_user_subscription(
        db,
        subscription=local_subscription,
        tenant_id=UUID(str(tenant_id_raw)) if tenant_id_raw else None,
    )


def process_stripe_webhook(
    db: Session,
    *,
    payload: bytes,
    signature_header: str | None,
) -> dict[str, Any]:
    event = construct_stripe_event(payload=payload, signature_header=signature_header)
    event_id = _coerce_str(_object_get(event, "id"))
    event_type = _coerce_str(_object_get(event, "type"))
    if event_id is None or event_type is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Stripe event")

    if has_processed_billing_webhook_event(db, event_id=event_id):
        return {"status": "ignored", "event_id": event_id, "event_type": event_type}

    event_data = _object_get(event, "data", {}) or {}
    event_object = _object_get(event_data, "object")

    if event_type == "checkout.session.completed":
        _handle_checkout_session_completed(db, event_object)
    elif event_type == "invoice.paid":
        _handle_invoice_paid(db, event_object)
    elif event_type == "customer.subscription.updated":
        _handle_customer_subscription_updated(db, event_object)
    elif event_type == "customer.subscription.deleted":
        _handle_customer_subscription_deleted(db, event_object)

    mark_billing_webhook_event_processed(
        db,
        event_id=event_id,
        event_type=event_type,
    )
    db.commit()
    return {"status": "processed", "event_id": event_id, "event_type": event_type}
