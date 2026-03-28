from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from app.models import Campaign, PolicyPack, ToolRegistry, Trace
from app.services.campaign_service import create_campaign
from app.services.mutation_pack_service import ensure_registered_mutation_pack
from app.services.policy_service import create_policy_pack
from app.services.tool_registry_service import create_or_update_tool_registry_entry
from sqlalchemy import select
from sqlalchemy.orm import Session

INTERNAL_TOOLS = frozenset({"trace.load", "campaign.load", "agent.run_agent"})
BOOTSTRAP_POLICY_NAME = "trace.bootstrap.default"
BOOTSTRAP_CAMPAIGN_BUNDLE: tuple[tuple[str, str], ...] = (
    ("tool-chaos", "Bootstrap · Tool Chaos"),
    ("latency-chaos", "Bootstrap · Latency Chaos"),
    ("prompt-security", "Bootstrap · Prompt Security"),
)
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

    for pack_name, campaign_name in BOOTSTRAP_CAMPAIGN_BUNDLE:
        pack = ensure_registered_mutation_pack(
            db,
            project_id=project_id,
            pack_name=pack_name,
        )
        if pack is None:
            continue

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
