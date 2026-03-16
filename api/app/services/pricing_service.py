from __future__ import annotations

from typing import Literal

from app.schemas import AuthPermissionSet

PricingTier = Literal["starter", "team", "enterprise"]

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


def build_auth_permissions(role_name: str, pricing_tier: str | None) -> AuthPermissionSet:
    del role_name
    del pricing_tier
    return AuthPermissionSet(
        visible_sections=list(ALL_SECTIONS),
        can_upload_traces=True,
        can_create_campaigns=True,
        can_run_campaigns=True,
        can_manage_mutation_packs=True,
        can_manage_policy_packs=True,
        can_manage_security_config=True,
        can_manage_workspace=True,
        can_manage_api_keys=True,
        can_manage_billing=True,
    )
