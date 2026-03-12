from __future__ import annotations

from typing import Literal

from app.schemas import AuthPermissionSet

PricingTier = Literal["starter", "team", "enterprise"]

DEFAULT_PRICING_TIER: PricingTier = "team"

ALL_SECTIONS = [
    "dashboard",
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

ROLE_SECTION_ALLOWLIST: dict[str, list[str]] = {
    "admin": ALL_SECTIONS,
    "developer": [
        "dashboard",
        "traces",
        "campaigns",
        "runs",
        "reports",
        "mutation-packs",
        "policies",
        "security",
        "settings",
    ],
    "viewer": ["dashboard", "reports", "settings"],
}

PLAN_SECTION_ALLOWLIST: dict[PricingTier, list[str]] = {
    "starter": [
        "dashboard",
        "traces",
        "campaigns",
        "runs",
        "reports",
        "mutation-packs",
        "settings",
    ],
    "team": [
        "dashboard",
        "traces",
        "campaigns",
        "runs",
        "reports",
        "mutation-packs",
        "policies",
        "security",
        "webhooks",
        "settings",
    ],
    "enterprise": ALL_SECTIONS,
}

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
    normalized_role = role_name if role_name in ROLE_SECTION_ALLOWLIST else "viewer"
    normalized_tier = normalize_pricing_tier(pricing_tier)

    role_sections = set(ROLE_SECTION_ALLOWLIST[normalized_role])
    plan_sections = set(PLAN_SECTION_ALLOWLIST[normalized_tier])
    visible_sections = [
        section for section in ROLE_SECTION_ALLOWLIST[normalized_role] if section in plan_sections
    ]
    visible_section_set = set(visible_sections)

    can_upload_traces = normalized_role in {"admin", "developer"}
    can_create_campaigns = normalized_role in {"admin", "developer"}
    can_run_campaigns = normalized_role in {"admin", "developer"}
    can_manage_mutation_packs = (
        normalized_role in {"admin", "developer"} and "mutation-packs" in visible_section_set
    )
    can_manage_policy_packs = normalized_role == "admin" and "policies" in visible_section_set
    can_manage_security_config = normalized_role == "admin" and "security" in visible_section_set
    can_manage_workspace = normalized_role == "admin"
    can_manage_api_keys = normalized_role == "admin"

    # Keep action controls role-scoped for now, but never advertise sections the plan excludes.
    if not role_sections.intersection(plan_sections):
        visible_sections = ["dashboard"]

    return AuthPermissionSet(
        visible_sections=visible_sections,
        can_upload_traces=can_upload_traces,
        can_create_campaigns=can_create_campaigns,
        can_run_campaigns=can_run_campaigns,
        can_manage_mutation_packs=can_manage_mutation_packs,
        can_manage_policy_packs=can_manage_policy_packs,
        can_manage_security_config=can_manage_security_config,
        can_manage_workspace=can_manage_workspace,
        can_manage_api_keys=can_manage_api_keys,
    )
