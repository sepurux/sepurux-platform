from __future__ import annotations

from typing import Literal

from app.schemas import AuthPermissionSet

PricingTier = Literal["starter", "team", "enterprise"]
BillingPlanName = Literal["free", "pro", "team", "enterprise"]

DEFAULT_PRICING_TIER: PricingTier = "starter"

ALL_SECTIONS = [
    "dashboard",
    "billing",
    "traces",
    "campaigns",
    "runs",
    "reports",
    "mutation-packs",
    "policies",
    "security",
    "audit",
    "webhooks",
    "settings",
]

CORE_SECTIONS = [
    "dashboard",
    "billing",
    "traces",
    "campaigns",
    "runs",
    "reports",
    "mutation-packs",
    "settings",
]

ADVANCED_SECTIONS = [
    "policies",
    "security",
    "webhooks",
    "audit",
]

PLAN_LABELS: dict[PricingTier, str] = {
    "starter": "Starter",
    "team": "Team",
    "enterprise": "Enterprise",
}


def normalize_pricing_tier(value: str | None) -> PricingTier:
    if value == "starter":
        return "starter"
    if value == "enterprise":
        return "enterprise"
    return "team"


def plan_label(value: str | None) -> str:
    return PLAN_LABELS[normalize_pricing_tier(value)]


def _normalize_billing_plan_name(value: str | None) -> BillingPlanName | None:
    normalized = (value or "").strip().lower()
    if normalized == "free":
        return "free"
    if normalized == "pro":
        return "pro"
    if normalized == "team":
        return "team"
    if normalized == "enterprise":
        return "enterprise"
    return None


def _default_billing_plan_for_pricing_tier(pricing_tier: str | None) -> BillingPlanName:
    tier = normalize_pricing_tier(pricing_tier)
    if tier == "starter":
        return "free"
    if tier == "enterprise":
        return "enterprise"
    return "team"


def _visible_sections_for_plan(plan: BillingPlanName) -> list[str]:
    if plan in {"free", "pro"}:
        return list(CORE_SECTIONS)
    return list(CORE_SECTIONS + ADVANCED_SECTIONS)


def build_auth_permissions(
    role_name: str,
    pricing_tier: str | None,
    *,
    billing_plan_name: str | None = None,
) -> AuthPermissionSet:
    del role_name
    resolved_plan = _normalize_billing_plan_name(
        billing_plan_name
    ) or _default_billing_plan_for_pricing_tier(pricing_tier)
    advanced_enabled = resolved_plan in {"team", "enterprise"}
    return AuthPermissionSet(
        visible_sections=_visible_sections_for_plan(resolved_plan),
        can_upload_traces=True,
        can_create_campaigns=True,
        can_run_campaigns=True,
        can_manage_mutation_packs=True,
        can_manage_policy_packs=advanced_enabled,
        can_manage_security_config=advanced_enabled,
        can_manage_workspace=True,
        can_manage_api_keys=True,
        can_manage_billing=True,
    )
