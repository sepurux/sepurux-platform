from __future__ import annotations

from dataclasses import dataclass
import hashlib
from typing import Any
from uuid import UUID

from app.models import Campaign, MutationPack, PolicyPack, ToolRegistry, Trace
from app.services.campaign_service import create_campaign
from app.services.mutation_pack_policy import coverage_score_for_config
from app.services.mutation_pack_service import (
    create_mutation_pack,
    ensure_registered_mutation_pack,
    get_mutation_pack_by_name,
)
from app.services.policy_service import create_policy_pack
from app.services.tool_registry_service import create_or_update_tool_registry_entry
from sqlalchemy import select
from sqlalchemy.orm import Session

INTERNAL_TOOLS = frozenset({"trace.load", "campaign.load", "agent.run_agent"})
BOOTSTRAP_POLICY_NAME = "trace.bootstrap.default"
BOOTSTRAP_SYSTEM_CAMPAIGN_BUNDLE: tuple[tuple[str, str], ...] = (
    ("sepurux.core.reliability", "Bootstrap · Base Reliability"),
    ("prompt-security", "Bootstrap · Policy & Security"),
)
BOOTSTRAP_DOMAIN_PACK_PREFIX = "trace.domain"
READ_TOOL_HINTS = (
    "get",
    "list",
    "fetch",
    "search",
    "read",
    "lookup",
    "describe",
    "query",
    "find",
)
WRITE_TOOL_HINTS = (
    "create",
    "update",
    "delete",
    "remove",
    "refund",
    "charge",
    "purchase",
    "send",
    "post",
    "write",
    "commit",
    "deploy",
    "invite",
)


@dataclass(frozen=True)
class TraceBootstrapCampaignResult:
    campaign_id: UUID
    name: str
    mutation_pack_id: UUID
    mutation_pack_name: str
    created: bool


@dataclass(frozen=True)
class TraceBootstrapResult:
    trace_id: UUID
    tools_discovered: list[str]
    tool_zones_created: int
    tool_zones_updated: int
    policy_pack_id: UUID | None
    policy_pack_name: str | None
    policy_pack_created: bool
    campaigns: list[TraceBootstrapCampaignResult]


def bootstrap_project_from_trace(
    db: Session,
    *,
    trace: Trace,
    actor: str | None = None,
) -> TraceBootstrapResult:
    payload = trace.normalized_payload if isinstance(trace.normalized_payload, dict) else {}
    tools = _extract_tools_from_trace_payload(payload)

    created_count, updated_count = _bootstrap_tool_zones(
        db,
        project_id=trace.project_id,
        tools=tools,
    )

    policy_pack, policy_pack_created = _bootstrap_policy_pack(
        db,
        project_id=trace.project_id,
        tools=tools,
        actor=actor,
    )

    _ensure_trace_domain_mutation_pack(
        db,
        project_id=trace.project_id,
        tools=tools,
    )

    campaign_results = _bootstrap_campaign_bundle(
        db,
        project_id=trace.project_id,
        tools=tools,
        actor=actor,
    )

    return TraceBootstrapResult(
        trace_id=trace.trace_id,
        tools_discovered=tools,
        tool_zones_created=created_count,
        tool_zones_updated=updated_count,
        policy_pack_id=(policy_pack.policy_pack_id if policy_pack is not None else None),
        policy_pack_name=(policy_pack.name if policy_pack is not None else None),
        policy_pack_created=policy_pack_created,
        campaigns=campaign_results,
    )


def _extract_tools_from_trace_payload(payload: dict[str, Any]) -> list[str]:
    events = payload.get("events")
    if not isinstance(events, list):
        return []

    seen: set[str] = set()
    ordered: list[str] = []
    for event in events:
        if not isinstance(event, dict):
            continue
        event_type = str(event.get("type") or "").strip()
        if event_type not in {"tool_call", "tool_result"}:
            continue
        tool = event.get("tool")
        if not isinstance(tool, str):
            continue
        normalized = tool.strip()
        if not normalized or normalized in INTERNAL_TOOLS:
            continue
        if normalized in seen:
            continue
        seen.add(normalized)
        ordered.append(normalized)
    return ordered


def extract_tools_from_trace_payload(payload: dict[str, Any]) -> list[str]:
    """Public helper for deriving replay tools from a normalized trace payload."""
    return _extract_tools_from_trace_payload(payload)


def trace_domain_pack_name_for_tools(tools: list[str]) -> str | None:
    normalized = _normalize_tools_for_fingerprint(tools)
    if not normalized:
        return None
    fingerprint = _tool_fingerprint(normalized)
    return f"{BOOTSTRAP_DOMAIN_PACK_PREFIX}.{fingerprint[:12]}"


def build_bootstrap_policy_document(tools: list[str]) -> dict[str, Any]:
    """Public helper for generating the default bootstrap policy from observed tools."""
    return _build_policy_document(tools)


def _bootstrap_tool_zones(
    db: Session,
    *,
    project_id: UUID,
    tools: list[str],
) -> tuple[int, int]:
    existing = {
        record.name: record
        for record in db.scalars(select(ToolRegistry).where(ToolRegistry.project_id == project_id))
        if isinstance(record.name, str) and record.name
    }
    created_count = 0
    updated_count = 0

    for tool in tools:
        desired_zone = "untrusted"
        current = existing.get(tool)
        if current is None:
            create_or_update_tool_registry_entry(
                db,
                project_id=project_id,
                name=tool,
                zone=desired_zone,
            )
            created_count += 1
            existing = {
                record.name: record
                for record in db.scalars(
                    select(ToolRegistry).where(ToolRegistry.project_id == project_id)
                )
                if isinstance(record.name, str) and record.name
            }
            continue
        # Preserve explicit user-managed zones; bootstrap should only default unknown tools.
        if current.zone in {"", None}:
            create_or_update_tool_registry_entry(
                db,
                project_id=project_id,
                name=tool,
                zone=desired_zone,
            )
            updated_count += 1
    return created_count, updated_count


def _bootstrap_policy_pack(
    db: Session,
    *,
    project_id: UUID,
    tools: list[str],
    actor: str | None,
) -> tuple[PolicyPack | None, bool]:
    existing = db.scalar(
        select(PolicyPack).where(
            PolicyPack.project_id == project_id,
            PolicyPack.name == BOOTSTRAP_POLICY_NAME,
            PolicyPack.is_archived.is_(False),
        )
    )
    if isinstance(existing, PolicyPack):
        return existing, False

    policy_doc = _build_policy_document(tools)
    created = create_policy_pack(
        db,
        project_id=project_id,
        name=BOOTSTRAP_POLICY_NAME,
        engine="builtin",
        policy=policy_doc,
        actor=actor,
    )
    return created, True


def _bootstrap_campaign_bundle(
    db: Session,
    *,
    project_id: UUID,
    tools: list[str],
    actor: str | None,
) -> list[TraceBootstrapCampaignResult]:
    existing_by_name = {
        campaign.name: campaign
        for campaign in db.scalars(select(Campaign).where(Campaign.project_id == project_id))
        if campaign.status != "archived"
    }

    primary_tool = tools[0] if tools else "replay.execute"
    mutation_set = [
        {
            "mutation_id": "baseline",
            "tool": primary_tool,
            "args": {"bootstrap": True},
        }
    ]
    results: list[TraceBootstrapCampaignResult] = []
    campaign_specs: list[tuple[MutationPack, str]] = []

    for pack_name, campaign_name in BOOTSTRAP_SYSTEM_CAMPAIGN_BUNDLE:
        pack = ensure_registered_mutation_pack(db, project_id=project_id, pack_name=pack_name)
        if pack is not None:
            campaign_specs.append((pack, campaign_name))

    for pack, campaign_name in campaign_specs:
        existing = existing_by_name.get(campaign_name)
        if isinstance(existing, Campaign):
            results.append(
                TraceBootstrapCampaignResult(
                    campaign_id=existing.campaign_id,
                    name=existing.name,
                    mutation_pack_id=pack.mutation_pack_id,
                    mutation_pack_name=pack.name,
                    created=False,
                )
            )
            continue

        suggested_attempts = 20
        if isinstance(pack.config, dict):
            value = pack.config.get("suggested_attempts")
            if isinstance(value, int) and value > 0:
                suggested_attempts = value

        created_campaign = create_campaign(
            db,
            project_id=project_id,
            name=campaign_name,
            mutation_set=mutation_set,
            eval_set={"checks": ["status"], "attempts_count": suggested_attempts},
            mutation_pack_id=pack.mutation_pack_id,
            actor=actor,
        )
        existing_by_name[created_campaign.name] = created_campaign
        results.append(
            TraceBootstrapCampaignResult(
                campaign_id=created_campaign.campaign_id,
                name=created_campaign.name,
                mutation_pack_id=pack.mutation_pack_id,
                mutation_pack_name=pack.name,
                created=True,
            )
        )

    return results


def _ensure_trace_domain_mutation_pack(
    db: Session,
    *,
    project_id: UUID,
    tools: list[str],
) -> MutationPack | None:
    pack_name = trace_domain_pack_name_for_tools(tools)
    if pack_name is None:
        return None

    normalized_tools = _normalize_tools_for_fingerprint(tools)
    desired_config = _build_trace_domain_mutation_pack_config(normalized_tools)
    desired_description = (
        "Trace-derived domain pack seeded from observed tools. "
        "Editable: keep custom mutations; auto-generated mutations refresh when matching "
        "tool fingerprints are uploaded again."
    )

    existing = get_mutation_pack_by_name(
        db,
        project_id=project_id,
        name=pack_name,
    )
    if existing is not None:
        merged_config = _merge_existing_domain_pack_config(
            existing_config=existing.config if isinstance(existing.config, dict) else None,
            auto_config=desired_config,
        )
        has_changes = (
            existing.description != desired_description
            or existing.config != merged_config
            or int(existing.coverage_score or 0) != int(coverage_score_for_config(merged_config))
        )
        if has_changes:
            existing.description = desired_description
            existing.config = merged_config
            existing.coverage_score = coverage_score_for_config(merged_config)
            db.add(existing)
            db.commit()
            db.refresh(existing)
        return existing

    return create_mutation_pack(
        db,
        project_id=project_id,
        name=pack_name,
        description=desired_description,
        config=desired_config,
    )


def _build_trace_domain_mutation_pack_config(tools: list[str]) -> dict[str, Any]:
    normalized_tools = _normalize_tools_for_fingerprint(tools)
    primary_tool = normalized_tools[0] if normalized_tools else "tool.default"
    secondary_tool = normalized_tools[1] if len(normalized_tools) > 1 else primary_tool
    tertiary_tool = normalized_tools[2] if len(normalized_tools) > 2 else primary_tool

    mutations: list[dict[str, Any]] = [
        {
            "mutation_id": f"auto.{_slug_tool_name(primary_tool)}-schema-drop",
            "type": "schema.drop_field",
            "target": {"tool": primary_tool},
            "params": {"field": _guess_schema_field(primary_tool)},
            "probability": 0.35,
            "weight": 1.2,
        },
        {
            "mutation_id": f"auto.{_slug_tool_name(secondary_tool)}-timeout",
            "type": "fault.timeout",
            "target": {"tool": secondary_tool},
            "params": {
                "timeout_ms": 3500,
                "error_message": "simulated timeout from trace-derived domain pack",
            },
            "probability": 0.3,
            "weight": 1.6,
        },
        {
            "mutation_id": f"auto.{_slug_tool_name(secondary_tool)}-rate-limit",
            "type": "fault.rate_limit",
            "target": {"tool": secondary_tool},
            "probability": 0.2,
            "weight": 1.1,
        },
        {
            "mutation_id": f"auto.{_slug_tool_name(tertiary_tool)}-latency-spike",
            "type": "latency_delay",
            "target": {"tool": tertiary_tool},
            "params": {"min_ms": 1500, "max_ms": 6000},
            "probability": 0.5,
            "weight": 1.3,
        },
    ]

    for extra_tool in normalized_tools[3:6]:
        mutations.append(
            {
                "mutation_id": f"auto.{_slug_tool_name(extra_tool)}-timeout",
                "type": "fault.timeout",
                "target": {"tool": extra_tool},
                "params": {
                    "timeout_ms": 3500,
                    "error_message": "simulated timeout from trace-derived domain pack",
                },
                "probability": 0.3,
                "weight": 1.0,
            }
        )

    return {
        "version": "0.1",
        "suggested_attempts": 50,
        "max_mutations_per_attempt": 2,
        "domain_metadata": {
            "tool_fingerprint": _tool_fingerprint(normalized_tools) if normalized_tools else None,
            "tool_inventory": normalized_tools,
            "auto_mutation_prefix": "auto.",
        },
        "mutations": mutations,
    }


def _merge_existing_domain_pack_config(
    *,
    existing_config: dict[str, Any] | None,
    auto_config: dict[str, Any],
) -> dict[str, Any]:
    merged: dict[str, Any] = dict(existing_config) if isinstance(existing_config, dict) else {}
    # Replace auto-generated metadata fields with fresh values.
    merged["version"] = auto_config.get("version")
    merged["suggested_attempts"] = auto_config.get("suggested_attempts")
    merged["max_mutations_per_attempt"] = auto_config.get("max_mutations_per_attempt")
    merged["domain_metadata"] = auto_config.get("domain_metadata")

    auto_mutations = auto_config.get("mutations")
    auto_mutation_list = (
        [item for item in auto_mutations if isinstance(item, dict)]
        if isinstance(auto_mutations, list)
        else []
    )

    existing_mutations_obj = merged.get("mutations")
    existing_mutations = (
        [item for item in existing_mutations_obj if isinstance(item, dict)]
        if isinstance(existing_mutations_obj, list)
        else []
    )
    preserved_custom_mutations: list[dict[str, Any]] = []
    for mutation in existing_mutations:
        mutation_id = mutation.get("mutation_id")
        if isinstance(mutation_id, str) and mutation_id.startswith("auto."):
            continue
        preserved_custom_mutations.append(mutation)

    merged["mutations"] = auto_mutation_list + preserved_custom_mutations
    return merged


def _normalize_tools_for_fingerprint(tools: list[str]) -> list[str]:
    seen: set[str] = set()
    normalized: list[str] = []
    for tool in tools:
        if not isinstance(tool, str):
            continue
        name = tool.strip()
        if not name or name in INTERNAL_TOOLS or name in seen:
            continue
        seen.add(name)
        normalized.append(name)
    return sorted(normalized)


def _tool_fingerprint(tools: list[str]) -> str:
    payload = "|".join(tool.strip().lower() for tool in tools if isinstance(tool, str) and tool.strip())
    return hashlib.sha256(payload.encode()).hexdigest()


def _slug_tool_name(tool_name: str) -> str:
    return "-".join(
        segment
        for segment in "".join(
            character.lower() if character.isalnum() else "-"
            for character in tool_name.strip()
        ).split("-")
        if segment
    )[:40] or "tool-default"


def _guess_schema_field(tool_name: str) -> str:
    lowered = tool_name.lower()
    if any(hint in lowered for hint in ("search", "doc", "kb")):
        return "hits"
    if any(hint in lowered for hint in ("ticket", "case", "issue")):
        return "ticket_id"
    if any(hint in lowered for hint in ("slack", "email", "message", "notify")):
        return "message_id"
    return "status"


def _build_policy_document(tools: list[str]) -> dict[str, Any]:
    read_tools: list[str] = []
    write_tools: list[str] = []
    for tool in tools:
        if _looks_write_like(tool):
            write_tools.append(tool)
            continue
        if _looks_read_like(tool):
            read_tools.append(tool)
            continue
        write_tools.append(tool)

    rules: list[dict[str, Any]] = []
    for tool in sorted(read_tools):
        rules.append(
            {
                "match": {"tool": tool},
                "effect": "allow",
                "reason": f"bootstrap allow rule for observed read tool '{tool}'",
            }
        )
    for tool in sorted(write_tools):
        rules.append(
            {
                "match": {"tool": tool},
                "effect": "require_approval",
                "reason": f"bootstrap approval rule for observed write tool '{tool}'",
            }
        )

    return {
        "version": "0.1",
        "defaults": {"unknown_tools": "deny"},
        "irreversible": {"tools": sorted(set(write_tools))},
        "approval": {"token_field": "confirmation_token"},
        "rules": rules,
    }


def _looks_read_like(tool_name: str) -> bool:
    lowered = tool_name.lower()
    return any(hint in lowered for hint in READ_TOOL_HINTS)


def _looks_write_like(tool_name: str) -> bool:
    lowered = tool_name.lower()
    return any(hint in lowered for hint in WRITE_TOOL_HINTS)
