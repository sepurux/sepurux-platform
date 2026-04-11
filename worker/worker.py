from __future__ import annotations

import logging
from collections import Counter, OrderedDict
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

import redis
from rq import Queue, Worker
from sqlalchemy import select
from sqlalchemy.orm import Session

from config import get_settings
from counterfactuals import run_counterfactual_replays
from db import get_session
from failure_classifier import FailureClassificationInput, classify_attempt_failure
from models import (
    AuditEvent,
    AuditLog,
    Campaign,
    Counterfactual,
    CreditTransaction,
    CreditWallet,
    Failure,
    HardeningTemplate,
    MutationPack,
    PolicyEvent,
    PolicyPack,
    PolicyPackVersion,
    Project,
    ReplayAttempt,
    Run,
    RunTemplateLink,
    ScheduledCampaign,
    SecurityEvent,
    ToolRegistry,
    Trace,
    Webhook,
)
from mutation_engine import apply_mutation_pack
from policy.opa_client import OPAResponseError, OPAUnavailableError, evaluate_policy_with_opa
from policy_engine import (
    approval_token_field,
    evaluate_policy,
    has_confirmation_token,
    normalize_action,
)
from reliability_score import calculate_reliability_score
from replayer import (
    ReplayAdapterConfig,
    RetryPolicyConfig,
    build_attempt_replay_outcome,
    iter_mutations,
)
from security import detect_prompt_injection, sanitize_untrusted_text
from storage import put_json_object
from trace_steps import persist_attempt_trace_steps
from webhooks import is_webhook_subscribed, send_signed_webhook

logger = logging.getLogger(__name__)
INTERNAL_REPLAY_TOOLS = frozenset({"trace.load", "campaign.load", "agent.run_agent"})
_RECOVERABLE_MUTATION_FAILURES = frozenset({"timeout", "rate_limited", "transient_network"})


def _summary_value_as_int(summary: dict[str, Any], key: str) -> int:
    value = summary.get(key)
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int | float):
        return int(value)
    return 0


def _summary_value_as_float(summary: dict[str, Any], key: str) -> float:
    value = summary.get(key)
    if isinstance(value, bool):
        return float(int(value))
    if isinstance(value, int | float):
        return float(value)
    return 0.0


def _campaign_mutation_set_is_empty(mutation_set: Any) -> bool:
    if mutation_set is None:
        return True
    if isinstance(mutation_set, list):
        return len(mutation_set) == 0
    if isinstance(mutation_set, dict):
        nested = mutation_set.get("mutations")
        if isinstance(nested, list):
            return len(nested) == 0
        return len(mutation_set) == 0
    return False


def _seed_baseline_mutations_from_trace(trace: Trace) -> list[dict[str, Any]]:
    payload = trace.normalized_payload if isinstance(trace.normalized_payload, dict) else {}
    events = payload.get("events")
    if not isinstance(events, list):
        return []

    def _candidate_from_event(event: dict[str, Any]) -> dict[str, Any] | None:
        tool = event.get("tool")
        if not isinstance(tool, str):
            return None
        normalized_tool = tool.strip()
        if not normalized_tool or normalized_tool in INTERNAL_REPLAY_TOOLS:
            return None
        args = event.get("args") if isinstance(event.get("args"), dict) else {}
        return {
            "mutation_id": "baseline.auto_seed",
            "tool": normalized_tool,
            "args": args,
        }

    for event in events:
        if not isinstance(event, dict):
            continue
        if event.get("type") != "tool_call":
            continue
        candidate = _candidate_from_event(event)
        if candidate is not None:
            return [candidate]

    for event in events:
        if not isinstance(event, dict):
            continue
        if event.get("type") != "tool_result":
            continue
        candidate = _candidate_from_event(event)
        if candidate is not None:
            return [candidate]

    return []


def _record_run_completed_audit_event(db: Session, *, run: Run) -> AuditEvent:
    summary = run.summary if isinstance(run.summary, dict) else {}
    created_at = datetime.now(UTC)
    metadata = {
        "run_id": str(run.run_id),
        "status": run.status,
        "attempt_count": _summary_value_as_int(summary, "attempt_count"),
        "passed_count": _summary_value_as_int(summary, "passed_count"),
        "failed_count": _summary_value_as_int(summary, "failed_count"),
        "unsafe_count": _summary_value_as_int(summary, "unsafe_count"),
        "pass_rate": _summary_value_as_float(summary, "pass_rate"),
        "policy_events_count": _summary_value_as_int(summary, "policy_events_count"),
        "security_events_count": _summary_value_as_int(summary, "security_events_count"),
    }
    record = AuditEvent(
        audit_event_id=uuid4(),
        project_id=run.project_id,
        event_type="run.completed",
        actor="system",
        event_metadata=metadata,
        created_at=created_at,
    )
    db.add(record)
    db.add(
        AuditLog(
            id=uuid4(),
            action="system.run.completed",
            actor="system",
            entity=f"run:{run.run_id}",
            audit_metadata=metadata,
            created_at=created_at,
        )
    )
    db.flush()
    return record


def _dispatch_project_webhooks_for_event(
    db: Session,
    *,
    project_id: UUID,
    event_type: str,
    data: dict[str, Any],
    created_at: datetime,
) -> None:
    webhooks = list(
        db.scalars(
            select(Webhook).where(
                Webhook.project_id == project_id,
                Webhook.is_enabled.is_(True),
            )
        )
    )
    payload = {
        "event_type": event_type,
        "project_id": str(project_id),
        "data": data,
        "created_at": created_at.isoformat(),
    }
    for webhook in webhooks:
        if not is_webhook_subscribed(webhook.events, event_type):
            continue
        success, error_message = send_signed_webhook(
            url=webhook.url,
            secret=webhook.secret,
            payload=payload,
        )
        if success:
            webhook.last_success_at = datetime.now(UTC)
            webhook.last_error = None
        else:
            webhook.last_error = error_message
        db.add(webhook)


def _extract_tool_usage_metadata(
    timeline_artifact: dict[str, Any],
) -> tuple[list[str], dict[str, int]]:
    events = timeline_artifact.get("events")
    if not isinstance(events, list):
        return [], {}

    ordered_tools: OrderedDict[str, None] = OrderedDict()
    tool_call_counts: dict[str, int] = {}
    for event in events:
        if not isinstance(event, dict):
            continue
        if event.get("type") != "tool_call":
            continue
        tool = event.get("tool")
        if not isinstance(tool, str) or not tool:
            continue
        ordered_tools.setdefault(tool, None)
        tool_call_counts[tool] = tool_call_counts.get(tool, 0) + 1

    return list(ordered_tools.keys()), tool_call_counts


def _failure_breakdown_items(
    counts: Counter[str],
) -> list[dict[str, int | str]]:
    items: list[dict[str, int | str]] = []
    for failure_type, count in sorted(
        counts.items(),
        key=lambda item: (-item[1], item[0]),
    ):
        items.append({"type": failure_type, "count": count})
    return items


def _is_unsafe_failure_reason(failure_reason: str | None) -> bool:
    reason = (failure_reason or "").lower()
    return reason.startswith("unsafe") or reason == "policy_blocked"


def _policy_blocked_mutation(
    mutation: Any,
    *,
    failure_reason: str,
    error_type: str,
    error_message: str,
) -> dict[str, Any]:
    mutation_obj = mutation if isinstance(mutation, dict) else {"value": mutation}
    blocked_mutation = dict(mutation_obj)
    blocked_mutation["force_fail"] = True
    blocked_mutation["failure_reason"] = failure_reason
    blocked_mutation.setdefault("error_type", error_type)
    blocked_mutation.setdefault("error_message", error_message)
    return blocked_mutation


def _mutation_tool_name(mutation: Any) -> str:
    mutation_obj = mutation if isinstance(mutation, dict) else {}
    tool = mutation_obj.get("tool")
    if isinstance(tool, str) and tool:
        return tool
    return "replay.execute"


def _mutation_tool_args(mutation: Any) -> dict[str, Any]:
    mutation_obj = mutation if isinstance(mutation, dict) else {}
    args = mutation_obj.get("args")
    if isinstance(args, dict):
        return args
    return {}


def _extract_policy_inputs(mutation: Any) -> tuple[str, dict[str, Any], int | None]:
    mutation_obj = mutation if isinstance(mutation, dict) else {}
    event_obj = mutation_obj.get("event")
    if isinstance(event_obj, dict) and event_obj.get("type") == "tool_call":
        event_tool = event_obj.get("tool")
        event_args = event_obj.get("args")
        tool_name = (
            event_tool
            if isinstance(event_tool, str) and event_tool
            else _mutation_tool_name(mutation)
        )
        args = event_args if isinstance(event_args, dict) else _mutation_tool_args(mutation)
        event_index = event_obj.get("index")
        index = event_index if isinstance(event_index, int) else None
    else:
        tool_name = _mutation_tool_name(mutation)
        args = _mutation_tool_args(mutation)
        mutation_event_index = mutation_obj.get("event_index")
        index = mutation_event_index if isinstance(mutation_event_index, int) else 2

    merged_args = dict(args)
    top_level_confirmation_token = mutation_obj.get("confirmation_token")
    if top_level_confirmation_token and "confirmation_token" not in merged_args:
        merged_args["confirmation_token"] = top_level_confirmation_token

    if not merged_args:
        fallback_keys = (
            "commit",
            "mode",
            "action",
            "finalize",
            "dry_run",
            "confirm",
            "confirmation_token",
            "approval_token",
        )
        for key in fallback_keys:
            if key in mutation_obj:
                merged_args[key] = mutation_obj[key]

    return tool_name, merged_args, index


def _template_auto_confirmation_enabled(config: dict[str, Any]) -> bool:
    explicit = config.get("auto_provide_confirmation_token")
    if isinstance(explicit, bool):
        return explicit
    if isinstance(explicit, str):
        normalized = explicit.strip().lower()
        if normalized in {"1", "true", "yes", "on"}:
            return True
        if normalized in {"0", "false", "no", "off"}:
            return False

    # Backward compatibility for templates created before explicit flag support.
    target_tool = config.get("target_tool")
    source_attempt_id = config.get("source_attempt_id")
    policy_obj = config.get("policy")
    return (
        isinstance(target_tool, str)
        and bool(target_tool.strip())
        and isinstance(source_attempt_id, str)
        and bool(source_attempt_id.strip())
        and isinstance(policy_obj, dict)
        and isinstance(policy_obj.get("approval"), dict)
    )


def _collect_template_confirmation_overrides(
    templates: list[HardeningTemplate],
) -> list[tuple[str, str, str]]:
    overrides: list[tuple[str, str, str]] = []
    seen: set[tuple[str, str]] = set()

    for template in templates:
        if template.type != "policy_pack":
            continue
        config = _template_config_dict(template)
        if not _template_auto_confirmation_enabled(config):
            continue

        policy_obj = config.get("policy")
        token_field = "confirmation_token"
        if isinstance(policy_obj, dict):
            approval_obj = policy_obj.get("approval")
            if isinstance(approval_obj, dict):
                candidate_field = approval_obj.get("token_field")
                if isinstance(candidate_field, str) and candidate_field.strip():
                    token_field = candidate_field.strip()

        token_value_obj = config.get("confirmation_token_value")
        token_value = (
            token_value_obj.strip()
            if isinstance(token_value_obj, str) and token_value_obj.strip()
            else "template-auto-confirmation-token"
        )

        tools: list[str] = []
        target_tool_obj = config.get("target_tool")
        if isinstance(target_tool_obj, str) and target_tool_obj.strip():
            tools.append(target_tool_obj.strip())
        if isinstance(policy_obj, dict):
            irreversible_obj = policy_obj.get("irreversible")
            if isinstance(irreversible_obj, dict):
                tools_obj = irreversible_obj.get("tools")
                if isinstance(tools_obj, list):
                    for tool_obj in tools_obj:
                        if isinstance(tool_obj, str) and tool_obj.strip():
                            tools.append(tool_obj.strip())

        for tool_name in tools:
            dedupe_key = (tool_name, token_field)
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            overrides.append((tool_name, token_field, token_value))

    return overrides


def _apply_template_confirmation_overrides(
    mutation: Any,
    *,
    overrides: list[tuple[str, str, str]],
) -> Any:
    if not overrides or not isinstance(mutation, dict):
        return mutation

    tool_name = _mutation_tool_name(mutation)
    relevant = [entry for entry in overrides if entry[0] == tool_name]
    if not relevant:
        return mutation

    mutation_obj = dict(mutation)
    merged_args = dict(_mutation_tool_args(mutation_obj))
    event_obj = mutation_obj.get("event")
    event_copy = dict(event_obj) if isinstance(event_obj, dict) else None
    event_args_copy: dict[str, Any] | None = None
    if event_copy is not None:
        event_args_obj = event_copy.get("args")
        if isinstance(event_args_obj, dict):
            event_args_copy = dict(event_args_obj)

    changed = False
    for _, token_field, token_value in relevant:
        if not token_field:
            continue
        if token_field not in merged_args or not merged_args[token_field]:
            merged_args[token_field] = token_value
            changed = True
        if token_field not in mutation_obj or not mutation_obj[token_field]:
            mutation_obj[token_field] = token_value
            changed = True
        if event_args_copy is not None and (
            token_field not in event_args_copy or not event_args_copy[token_field]
        ):
            event_args_copy[token_field] = token_value
            changed = True

    if not changed:
        return mutation

    mutation_obj["args"] = merged_args
    if event_copy is not None and event_args_copy is not None:
        event_copy["args"] = event_args_copy
        mutation_obj["event"] = event_copy
    return mutation_obj


def _build_policy_event_input(
    *,
    tool_name: str,
    tool_args: dict[str, Any],
    run_id: UUID,
    attempt_id: UUID,
    project_id: UUID,
    event_index: int | None,
) -> dict[str, Any]:
    return {
        "tool": {
            "name": tool_name,
            "args": tool_args,
        },
        "context": {
            "run_id": str(run_id),
            "attempt_id": str(attempt_id),
            "project_id": str(project_id),
        },
        "metadata": {
            "event_index": event_index,
        },
    }


def _template_config_dict(template: HardeningTemplate) -> dict[str, Any]:
    config = template.config
    if isinstance(config, dict):
        return config
    return {}


def _load_run_templates(db: Session, *, run: Run) -> list[HardeningTemplate]:
    template_ids = list(
        db.scalars(
            select(RunTemplateLink.template_id)
            .where(
                RunTemplateLink.run_id == run.run_id,
            )
            .order_by(RunTemplateLink.created_at.asc(), RunTemplateLink.template_id.asc())
        )
    )
    if not template_ids:
        return []

    templates = list(
        db.scalars(
            select(HardeningTemplate).where(
                HardeningTemplate.project_id == run.project_id,
                HardeningTemplate.template_id.in_(template_ids),
            )
        )
    )
    by_id = {template.template_id: template for template in templates}
    ordered: list[HardeningTemplate] = []
    for template_id in template_ids:
        template = by_id.get(template_id)
        if template is not None:
            ordered.append(template)
    return ordered


def _coerce_int(value: Any, *, default: int) -> int:
    if isinstance(value, bool):
        return default
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    return default


def _merge_retry_policy(
    *,
    current: RetryPolicyConfig,
    config: dict[str, Any],
) -> RetryPolicyConfig:
    configured_max_retries = _coerce_int(config.get("max_retries"), default=current.max_retries)
    configured_backoff_ms = _coerce_int(config.get("backoff_ms"), default=current.backoff_ms)
    # Never weaken an existing retry posture when stacking templates.
    max_retries = max(current.max_retries, configured_max_retries)
    backoff_ms = max(current.backoff_ms, configured_backoff_ms)
    return RetryPolicyConfig(max_retries=max(0, max_retries), backoff_ms=max(0, backoff_ms))


def _merge_adapter_config(
    *,
    current: ReplayAdapterConfig | None,
    config: dict[str, Any],
) -> ReplayAdapterConfig | None:
    mappings_raw = config.get("mappings")
    if not isinstance(mappings_raw, dict):
        mappings_raw = config.get("field_mappings")
    if not isinstance(mappings_raw, dict):
        return current

    clean_mappings: dict[str, str] = {}
    for raw_key, raw_value in mappings_raw.items():
        if not isinstance(raw_key, str) or not raw_key:
            continue
        if not isinstance(raw_value, str) or not raw_value:
            continue
        clean_mappings[raw_key] = raw_value
    if not clean_mappings:
        return current

    merged = dict(current.mappings or {}) if current is not None else {}
    merged.update(clean_mappings)
    return ReplayAdapterConfig(mappings=merged)


def _apply_schema_adapter_to_timeline(
    timeline_artifact: dict[str, Any],
    adapter_config: ReplayAdapterConfig | None,
) -> bool:
    mappings = adapter_config.mappings if adapter_config is not None else None
    if not isinstance(mappings, dict) or not mappings:
        return False

    events = timeline_artifact.get("events")
    if not isinstance(events, list):
        return False

    adapted_any = False
    for event in events:
        if not isinstance(event, dict):
            continue
        if event.get("type") != "tool_result":
            continue
        result = event.get("result")
        if not isinstance(result, dict):
            continue

        adapted_fields: dict[str, str] = {}
        for expected_field, source_field in mappings.items():
            if expected_field in result:
                continue
            if source_field not in result:
                continue
            result[expected_field] = result[source_field]
            adapted_fields[expected_field] = source_field

        if not adapted_fields:
            continue

        prior_adapted = result.get("adapted_fields")
        merged_adapted = dict(prior_adapted) if isinstance(prior_adapted, dict) else {}
        merged_adapted.update(adapted_fields)
        result["adapted_fields"] = merged_adapted
        result["adapter"] = "schema_adapter_v1"
        adapted_any = True

    return adapted_any


def _required_retries_for_failure_reason(failure_reason: str) -> int:
    normalized = failure_reason.strip().lower()
    if normalized == "timeout":
        return 2
    if normalized == "rate_limited":
        return 3
    return 1


def _mutation_required_backoff_ms(mutation_trace: dict[str, Any] | None) -> int:
    if not isinstance(mutation_trace, dict):
        return 0
    applied = mutation_trace.get("applied")
    if not isinstance(applied, list):
        return 0

    required_backoff = 0
    for item in applied:
        if not isinstance(item, dict):
            continue
        details = item.get("details")
        if not isinstance(details, dict):
            continue
        detail_type = details.get("type")
        if detail_type not in {"fault.timeout", "fault.rate_limit"}:
            continue
        raw_value = details.get("min_backoff_ms")
        if isinstance(raw_value, bool):
            continue
        if isinstance(raw_value, int):
            required_backoff = max(required_backoff, raw_value)
        elif isinstance(raw_value, float):
            required_backoff = max(required_backoff, int(raw_value))
    return max(0, required_backoff)


def _recover_mutation_forced_failure_with_retry(
    *,
    timeline_artifact: dict[str, Any],
    mutation_trace: dict[str, Any] | None,
    failure_reason: str | None,
    first_failure_event_index: int | None,
    first_failure_tool: str | None,
    retry_policy: RetryPolicyConfig,
) -> tuple[bool, dict[str, Any], str | None, int | None, str | None]:
    normalized_reason = (failure_reason or "").strip().lower()
    if normalized_reason not in _RECOVERABLE_MUTATION_FAILURES:
        return (
            False,
            timeline_artifact,
            failure_reason,
            first_failure_event_index,
            first_failure_tool,
        )

    required_retries = _required_retries_for_failure_reason(normalized_reason)
    if retry_policy.max_retries < required_retries:
        return (
            False,
            timeline_artifact,
            failure_reason,
            first_failure_event_index,
            first_failure_tool,
        )

    min_backoff_ms = _mutation_required_backoff_ms(mutation_trace)
    if retry_policy.backoff_ms < min_backoff_ms:
        return (
            False,
            timeline_artifact,
            failure_reason,
            first_failure_event_index,
            first_failure_tool,
        )

    events = timeline_artifact.get("events")
    if not isinstance(events, list):
        return (
            False,
            timeline_artifact,
            failure_reason,
            first_failure_event_index,
            first_failure_tool,
        )

    replaced = False
    for event in events:
        if not isinstance(event, dict):
            continue
        if event.get("type") != "error":
            continue
        event_index = event.get("index")
        if (
            isinstance(first_failure_event_index, int)
            and isinstance(event_index, int)
            and event_index != first_failure_event_index
        ):
            continue
        event_tool = event.get("tool")
        if (
            isinstance(first_failure_tool, str)
            and first_failure_tool
            and isinstance(event_tool, str)
            and event_tool != first_failure_tool
        ):
            continue

        resolved_tool = (
            event_tool
            if isinstance(event_tool, str) and event_tool
            else (first_failure_tool if isinstance(first_failure_tool, str) and first_failure_tool else "replay.execute")
        )
        mutation_id = timeline_artifact.get("mutation_id")
        mutation_id_str = (
            mutation_id if isinstance(mutation_id, str) and mutation_id else "baseline"
        )

        event["type"] = "tool_result"
        event["tool"] = resolved_tool
        event.pop("error", None)
        event["result"] = {
            "ok": True,
            "status": "replayed",
            "tool": resolved_tool,
            "mutation_id": mutation_id_str,
            "retries": required_retries,
            "recovered_from": normalized_reason,
            "recovery": "retry_policy_v1",
        }
        replaced = True
        break

    if not replaced:
        return (
            False,
            timeline_artifact,
            failure_reason,
            first_failure_event_index,
            first_failure_tool,
        )

    max_index = _max_timeline_event_index(events)
    events.append(
        {
            "index": max_index + 1,
            "type": "model",
            "result": {
                "summary": (
                    f"Recovered from {normalized_reason} after {required_retries} retries."
                )
            },
        }
    )
    timeline_artifact.pop("first_failure", None)

    return True, timeline_artifact, None, None, None


def _sanitize_text_value(value: str, patterns: list[str]) -> str:
    sanitized = value
    lower_value = sanitized.lower()
    for pattern in patterns:
        if pattern in lower_value:
            sanitized = sanitized.replace(pattern, "[redacted]")
            sanitized = sanitized.replace(pattern.upper(), "[redacted]")
            sanitized = sanitized.replace(pattern.title(), "[redacted]")
            lower_value = sanitized.lower()
    return sanitized


def _apply_sanitizer_to_timeline(
    timeline_artifact: dict[str, Any], config: dict[str, Any] | None
) -> dict[str, Any]:
    if not config:
        return timeline_artifact

    raw_fields = config.get("fields")
    field_names: list[str] = []
    if isinstance(raw_fields, list):
        field_names = [field for field in raw_fields if isinstance(field, str) and field]
    if not field_names:
        field_names = ["text", "content", "message", "summary"]

    raw_patterns = config.get("patterns")
    patterns: list[str] = []
    if isinstance(raw_patterns, list):
        patterns = [item.lower() for item in raw_patterns if isinstance(item, str) and item]
    if not patterns:
        patterns = [
            "ignore previous instructions",
            "disregard previous instructions",
            "system override",
        ]

    events = timeline_artifact.get("events")
    if not isinstance(events, list):
        return timeline_artifact

    for event in events:
        if not isinstance(event, dict):
            continue
        if event.get("type") != "tool_result":
            continue
        result = event.get("result")
        if not isinstance(result, dict):
            continue
        for field_name in field_names:
            value = result.get(field_name)
            if not isinstance(value, str):
                continue
            result[field_name] = _sanitize_text_value(value, patterns)
    return timeline_artifact


def _resolve_policy_pack_override(
    db: Session,
    *,
    run: Run,
    template: HardeningTemplate,
) -> tuple[PolicyPack | None, PolicyPackVersion | None]:
    config = _template_config_dict(template)
    policy_pack_id_value = config.get("policy_pack_id")

    policy_pack_id: UUID | None = None
    if isinstance(policy_pack_id_value, UUID):
        policy_pack_id = policy_pack_id_value
    elif isinstance(policy_pack_id_value, str):
        try:
            policy_pack_id = UUID(policy_pack_id_value)
        except ValueError as exc:
            raise ValueError("Invalid policy_pack template policy_pack_id") from exc

    if policy_pack_id is not None:
        policy_pack = db.get(PolicyPack, policy_pack_id)
        if policy_pack is None or policy_pack.project_id != run.project_id:
            raise ValueError("Policy pack override not found for this project")
        run.policy_pack_id = policy_pack.policy_pack_id
        version = _ensure_policy_pack_active_version(db, policy_pack=policy_pack)
        run.effective_policy_pack_version_id = version.version_id if version is not None else None
        return policy_pack, version

    policy_obj = config.get("policy")
    if not isinstance(policy_obj, dict):
        return None, None

    engine_value = config.get("engine")
    engine = engine_value if isinstance(engine_value, str) and engine_value else "builtin"
    policy_pack = PolicyPack(
        policy_pack_id=uuid4(),
        project_id=run.project_id,
        name=f"{template.name} (applied)",
        engine=engine,
        policy=policy_obj,
        active_version_id=None,
    )
    db.add(policy_pack)
    db.flush()

    version = PolicyPackVersion(
        version_id=uuid4(),
        policy_pack_id=policy_pack.policy_pack_id,
        version_number=1,
        policy=policy_obj,
        created_by="template",
    )
    db.add(version)
    db.flush()

    policy_pack.active_version_id = version.version_id
    db.add(policy_pack)

    run.policy_pack_id = policy_pack.policy_pack_id
    run.effective_policy_pack_version_id = version.version_id
    return policy_pack, version


def _ensure_policy_pack_active_version(
    db: Session,
    *,
    policy_pack: PolicyPack,
) -> PolicyPackVersion | None:
    if policy_pack.active_version_id is not None:
        active = db.scalar(
            select(PolicyPackVersion).where(
                PolicyPackVersion.policy_pack_id == policy_pack.policy_pack_id,
                PolicyPackVersion.version_id == policy_pack.active_version_id,
            )
        )
        if active is not None:
            return active

    latest = db.scalar(
        select(PolicyPackVersion)
        .where(PolicyPackVersion.policy_pack_id == policy_pack.policy_pack_id)
        .order_by(PolicyPackVersion.version_number.desc())
        .limit(1)
    )
    if latest is not None:
        policy_pack.active_version_id = latest.version_id
        db.add(policy_pack)
        db.flush()
        return latest

    if policy_pack.policy is None:
        return None

    created = PolicyPackVersion(
        version_id=uuid4(),
        policy_pack_id=policy_pack.policy_pack_id,
        version_number=1,
        policy=policy_pack.policy,
        created_by="worker",
    )
    db.add(created)
    db.flush()

    policy_pack.active_version_id = created.version_id
    db.add(policy_pack)
    db.flush()
    return created


def _load_tool_zones(db: Session, *, project_id: UUID) -> dict[str, str]:
    rows = list(
        db.scalars(
            select(ToolRegistry).where(
                ToolRegistry.project_id == project_id,
            )
        )
    )
    return {
        row.name: row.zone
        for row in rows
        if isinstance(row.name, str) and row.name and isinstance(row.zone, str) and row.zone
    }


_TEXT_FIELD_NAMES = frozenset(
    {
        "content",
        "text",
        "message",
        "body",
        "description",
        "output",
        "response",
        "summary",
        "title",
        "detail",
        "data",
    }
)


def _extract_tool_result_text_fields(result: dict[str, Any]) -> dict[str, str]:
    text_fields: dict[str, str] = {}
    for field, value in result.items():
        if isinstance(value, str) and value and field in _TEXT_FIELD_NAMES:
            text_fields[field] = value
    return text_fields


def _coerce_event_index(event: dict[str, Any], fallback: int) -> int:
    index = event.get("index")
    if isinstance(index, int):
        return index
    return fallback


def _max_timeline_event_index(events: list[dict[str, Any]]) -> int:
    max_index = -1
    for event in events:
        if not isinstance(event, dict):
            continue
        value = event.get("index")
        if isinstance(value, int):
            max_index = max(max_index, value)
    return max_index


def _campaign_attempt_repeats(campaign: Campaign) -> int:
    eval_set = campaign.eval_set if isinstance(campaign.eval_set, dict) else {}
    raw_attempts = eval_set.get("attempts_count")
    if isinstance(raw_attempts, bool):
        return 1
    if isinstance(raw_attempts, int):
        return max(1, min(raw_attempts, 50))
    if isinstance(raw_attempts, float):
        return max(1, min(int(raw_attempts), 50))
    return 1


def _campaign_eval_checks(campaign: Campaign) -> list[str]:
    eval_set = campaign.eval_set if isinstance(campaign.eval_set, dict) else {}
    raw_checks = eval_set.get("checks")
    if not isinstance(raw_checks, list):
        return []
    checks: list[str] = []
    for item in raw_checks:
        if not isinstance(item, str):
            continue
        normalized = item.strip()
        if normalized:
            checks.append(normalized)
    return checks


def _last_replay_tool_result_event(
    timeline_artifact: dict[str, Any],
) -> dict[str, Any] | None:
    events = timeline_artifact.get("events")
    if not isinstance(events, list):
        return None
    for event in reversed(events):
        if not isinstance(event, dict):
            continue
        if event.get("type") != "tool_result":
            continue
        tool_name = event.get("tool")
        if not isinstance(tool_name, str):
            continue
        if tool_name in {"trace.load", "campaign.load"}:
            continue
        result_obj = event.get("result")
        if not isinstance(result_obj, dict):
            continue
        return event
    return None


def _evaluate_attempt_checks(
    *,
    checks: list[str],
    timeline_artifact: dict[str, Any],
) -> tuple[str, str] | None:
    if not checks:
        return None

    raw_events = timeline_artifact.get("events")
    events: list[dict[str, Any]] = (
        [e for e in raw_events if isinstance(e, dict)] if isinstance(raw_events, list) else []
    )

    # Lazily resolved — only fetched when a check that needs it is encountered.
    _tool_result_fetched = False
    _tool_result_event: dict[str, Any] | None = None
    _result_obj: dict[str, Any] | None = None

    for check in checks:
        # ------------------------------------------------------------------
        # Checks that operate on the full event list (no tool_result needed)
        # ------------------------------------------------------------------
        if check == "no_unexpected_failures":
            error_events = [e for e in events if e.get("type") == "error"]
            if error_events:
                first = error_events[0]
                tool = first.get("tool") or "unknown"
                err = first.get("error")
                msg = (err.get("message") if isinstance(err, dict) else None) or "unknown error"
                return (
                    "unexpected_failure",
                    f"Eval check 'no_unexpected_failures' failed: error event for tool '{tool}': {msg}.",
                )
            continue

        if check.startswith("tool_was_called:"):
            tool_name = check[len("tool_was_called:") :]
            if not tool_name:
                continue
            called_tools = {e.get("tool") for e in events if e.get("type") == "tool_call"}
            if tool_name not in called_tools:
                return (
                    "missing_tool_call",
                    f"Eval check 'tool_was_called:{tool_name}' failed: tool '{tool_name}' was not called.",
                )
            continue

        # ------------------------------------------------------------------
        # Checks that need the last tool_result payload — resolve lazily
        # ------------------------------------------------------------------
        if not _tool_result_fetched:
            _tool_result_event = _last_replay_tool_result_event(timeline_artifact)
            _result_obj = (
                _tool_result_event.get("result") if isinstance(_tool_result_event, dict) else None
            )
            if not isinstance(_result_obj, dict):
                _result_obj = None
            _tool_result_fetched = True

        if not isinstance(_tool_result_event, dict):
            return (
                "replay_contract_invalid_response",
                "Eval checks require a replay tool_result event, but none was found.",
            )
        if _result_obj is None:
            return (
                "replay_contract_invalid_response",
                "Eval checks require an object tool_result payload.",
            )

        if check.startswith("output_contains:"):
            field_name = check[len("output_contains:") :]
            if not field_name:
                continue
            if field_name not in _result_obj:
                return (
                    "missing_field",
                    f"Eval check 'output_contains:{field_name}' failed: field '{field_name}' not found in last tool result.",
                )
            continue

        if check == "status":
            if "status" not in _result_obj:
                return ("missing_field", "Eval check 'status' failed: missing 'status'.")
            status_value = _result_obj.get("status")
            if not isinstance(status_value, str):
                return (
                    "type_mismatch",
                    "Eval check 'status' failed: status must be a string.",
                )
            if status_value != "replayed":
                return (
                    "schema_mismatch",
                    (
                        "Eval check 'status' failed: expected "
                        "'replayed' but received "
                        f"'{status_value}'."
                    ),
                )
            continue

        if check == "ok":
            if "ok" not in _result_obj:
                return ("missing_field", "Eval check 'ok' failed: missing 'ok'.")
            ok_value = _result_obj.get("ok")
            if not isinstance(ok_value, bool):
                return ("type_mismatch", "Eval check 'ok' failed: ok must be boolean.")
            if ok_value is not True:
                return ("schema_mismatch", "Eval check 'ok' failed: expected ok=true.")
            continue

    return None


def _apply_eval_checks_to_attempt(
    *,
    checks: list[str],
    result: str,
    failure_reason: str | None,
    first_failure_event_index: int | None,
    first_failure_tool: str | None,
    timeline_artifact: dict[str, Any],
) -> tuple[str, str | None, int | None, str | None, dict[str, Any]]:
    if result != "passed":
        return (
            result,
            failure_reason,
            first_failure_event_index,
            first_failure_tool,
            timeline_artifact,
        )
    check_failure = _evaluate_attempt_checks(
        checks=checks,
        timeline_artifact=timeline_artifact,
    )
    if check_failure is None:
        return (
            result,
            failure_reason,
            first_failure_event_index,
            first_failure_tool,
            timeline_artifact,
        )

    failed_reason, failed_message = check_failure
    tool_result_event = _last_replay_tool_result_event(timeline_artifact)
    failure_tool = "replay.execute"
    failure_event_index: int | None = None
    if isinstance(tool_result_event, dict):
        tool_name = tool_result_event.get("tool")
        if isinstance(tool_name, str) and tool_name:
            failure_tool = tool_name
        event_index = tool_result_event.get("index")
        if isinstance(event_index, int):
            failure_event_index = event_index

    events = timeline_artifact.get("events")
    if not isinstance(events, list):
        events = []
        timeline_artifact["events"] = events
    max_index = _max_timeline_event_index(events)
    error_event_index = max_index + 1 if max_index >= 0 else 0
    events.append(
        {
            "index": error_event_index,
            "type": "error",
            "tool": failure_tool,
            "error": {
                "type": "EvalCheckFailedError",
                "code": failed_reason,
                "message": failed_message,
            },
        }
    )

    timeline_artifact["first_failure"] = {
        "event_index": (
            failure_event_index if failure_event_index is not None else error_event_index
        ),
        "tool": failure_tool,
        "reason": failed_reason,
    }

    return (
        "failed",
        failed_reason,
        failure_event_index if failure_event_index is not None else error_event_index,
        failure_tool,
        timeline_artifact,
    )


def _select_applied_mutation(
    mutation_trace: dict[str, Any] | None,
    *,
    failure_reason: str | None,
    first_failure_tool: str | None,
) -> dict[str, Any] | None:
    if not isinstance(mutation_trace, dict):
        return None
    applied = mutation_trace.get("applied")
    if not isinstance(applied, list):
        return None

    best: tuple[int, int, dict[str, Any]] | None = None
    for item in applied:
        if not isinstance(item, dict):
            continue
        score = 0
        tool = item.get("tool")
        if isinstance(tool, str) and tool and tool == first_failure_tool:
            score += 3
        details = item.get("details")
        if isinstance(details, dict):
            detail_reason = details.get("failure_reason")
            if isinstance(detail_reason, str) and detail_reason and detail_reason == failure_reason:
                score += 4
        event_index = item.get("event_index")
        sortable_event_index = event_index if isinstance(event_index, int) else -1
        candidate = (score, sortable_event_index, item)
        if best is None or candidate[:2] > best[:2]:
            best = candidate

    return best[2] if best is not None else None


def _recorded_attempt_mutation_id(
    *,
    default_mutation_id: str,
    mutation_trace: dict[str, Any] | None,
    failure_reason: str | None,
    first_failure_tool: str | None,
) -> str:
    applied_mutation = _select_applied_mutation(
        mutation_trace,
        failure_reason=failure_reason,
        first_failure_tool=first_failure_tool,
    )
    if applied_mutation is None:
        return default_mutation_id
    mutation_id = applied_mutation.get("mutation_id")
    if isinstance(mutation_id, str) and mutation_id:
        return mutation_id
    return default_mutation_id


def _failure_tool_call_event(
    *,
    timeline_artifact: dict[str, Any],
    first_failure_tool: str | None,
    first_failure_event_index: int | None,
) -> dict[str, Any] | None:
    events = timeline_artifact.get("events")
    if not isinstance(events, list):
        return None

    candidate: dict[str, Any] | None = None
    for position, event in enumerate(events):
        if not isinstance(event, dict) or event.get("type") != "tool_call":
            continue
        tool = event.get("tool")
        if first_failure_tool and tool != first_failure_tool:
            continue
        event_index = _coerce_event_index(event, fallback=position)
        if first_failure_event_index is not None and event_index > first_failure_event_index:
            continue
        candidate = {
            "tool": tool,
            "args": event.get("args") if isinstance(event.get("args"), dict) else {},
            "index": event_index,
        }
    return candidate


def _default_error_type_for_failure_reason(failure_reason: str | None) -> str | None:
    normalized = (failure_reason or "").strip().lower()
    if not normalized:
        return None
    if normalized == "timeout":
        return "TimeoutError"
    if normalized == "rate_limited":
        return "RateLimitError"
    if normalized in {"policy_blocked", "policy_denied"}:
        return "PolicyDeniedError"
    if normalized == "policy_requires_approval":
        return "PolicyApprovalRequiredError"
    if normalized == "opa_unavailable":
        return "OPAUnavailableError"
    if normalized == "prompt_injection_blocked":
        return "PromptInjectionBlockedError"
    if normalized.startswith("replay_contract_"):
        return "ReplayContractError"
    return "ReplayError"


def _counterfactual_mutation_input(
    *,
    baseline_mutation: Any,
    timeline_artifact: dict[str, Any],
    mutation_trace: dict[str, Any] | None,
    attempt_mutation_id: str,
    failure_reason: str | None,
    first_failure_tool: str | None,
    first_failure_event_index: int | None,
) -> Any:
    mutation_obj = dict(baseline_mutation) if isinstance(baseline_mutation, dict) else {}
    mutation_obj["mutation_id"] = attempt_mutation_id

    tool_call = _failure_tool_call_event(
        timeline_artifact=timeline_artifact,
        first_failure_tool=first_failure_tool,
        first_failure_event_index=first_failure_event_index,
    )
    if tool_call is not None:
        tool_name = tool_call.get("tool")
        if isinstance(tool_name, str) and tool_name:
            mutation_obj["tool"] = tool_name
        mutation_obj["args"] = (
            tool_call.get("args") if isinstance(tool_call.get("args"), dict) else {}
        )
        mutation_obj["event"] = {
            "type": "tool_call",
            "tool": mutation_obj.get("tool"),
            "args": mutation_obj["args"],
            "index": tool_call.get("index"),
        }
        if isinstance(tool_call.get("index"), int):
            mutation_obj["event_index"] = tool_call["index"]

    applied_mutation = _select_applied_mutation(
        mutation_trace,
        failure_reason=failure_reason,
        first_failure_tool=first_failure_tool,
    )
    if applied_mutation is not None:
        details = applied_mutation.get("details")
        if isinstance(details, dict):
            detail_type = details.get("type")
            if isinstance(details.get("error_type"), str) and details.get("error_type"):
                mutation_obj["error_type"] = details["error_type"]
            if detail_type == "schema.drop_field":
                field_name = details.get("field")
                if isinstance(field_name, str) and field_name:
                    mutation_obj["missing_field"] = field_name
            elif detail_type == "schema.rename_field":
                from_field = details.get("from")
                if isinstance(from_field, str) and from_field:
                    mutation_obj["expected_field"] = from_field
            elif detail_type == "fault.timeout":
                timeout_ms = details.get("timeout_ms")
                if isinstance(timeout_ms, int | float) and not isinstance(timeout_ms, bool):
                    mutation_obj["timeout_ms"] = int(timeout_ms)

    if failure_reason:
        mutation_obj["force_fail"] = True
        mutation_obj["failure_reason"] = failure_reason

    mutation_obj.setdefault(
        "error_type",
        _default_error_type_for_failure_reason(failure_reason),
    )
    return mutation_obj or baseline_mutation


def _enforce_injection_firewall(
    *,
    timeline_artifact: dict[str, Any],
    tool_zones: dict[str, str],
) -> tuple[
    dict[str, Any],
    list[dict[str, Any]],
    int,
    int,
    str | None,
    int | None,
    str | None,
]:
    events_obj = timeline_artifact.get("events")
    if not isinstance(events_obj, list):
        return timeline_artifact, [], 0, 0, None, None, None

    events = [event for event in events_obj if isinstance(event, dict)]
    timeline_artifact["events"] = events

    security_event_rows: list[dict[str, Any]] = []
    injection_blocks = 0
    injection_sanitizations = 0
    blocked_failure_reason: str | None = None
    blocked_event_index: int | None = None
    blocked_tool: str | None = None

    for position, event in enumerate(events):
        if event.get("type") != "tool_result":
            continue
        result = event.get("result")
        if not isinstance(result, dict):
            continue
        text_fields = _extract_tool_result_text_fields(result)
        if not text_fields:
            continue

        raw_tool = event.get("tool")
        tool_name: str = raw_tool if isinstance(raw_tool, str) else "unknown"
        raw_zone = tool_zones.get(tool_name, "untrusted")
        zone = raw_zone if raw_zone == "trusted" else "untrusted"
        text_blob = "\n".join(text_fields.values())
        detection = detect_prompt_injection(text_blob)

        action = "allow"
        if zone == "untrusted":
            if detection.risk_score >= 0.7:
                action = "block"
            elif detection.risk_score >= 0.4:
                action = "sanitize"

        event_index = _coerce_event_index(event, fallback=position)
        security_event_rows.append(
            {
                "event_index": event_index,
                "tool": tool_name,
                "zone": zone,
                "risk_score": detection.risk_score,
                "action": action,
                "matches": detection.matches,
            }
        )

        if action == "sanitize":
            injection_sanitizations += 1
            for field_name, value in text_fields.items():
                result[field_name] = sanitize_untrusted_text(value)
            continue

        if action == "block":
            injection_blocks += 1
            blocked_failure_reason = "prompt_injection_blocked"
            blocked_event_index = event_index
            blocked_tool = tool_name

            max_index = _max_timeline_event_index(events)
            error_event_index = max(event_index + 1, max_index + 1)
            events[:] = events[: position + 1]
            events.append(
                {
                    "index": error_event_index,
                    "type": "error",
                    "tool": tool_name,
                    "error": {
                        "type": "PromptInjectionBlockedError",
                        "message": "Blocked untrusted tool output due to prompt injection risk",
                    },
                }
            )
            timeline_artifact["first_failure"] = {
                "event_index": blocked_event_index,
                "tool": blocked_tool,
                "reason": blocked_failure_reason,
            }
            break

    return (
        timeline_artifact,
        security_event_rows,
        injection_blocks,
        injection_sanitizations,
        blocked_failure_reason,
        blocked_event_index,
        blocked_tool,
    )


def execute_run(run_id: str) -> None:
    logger.info("Executing run %s", run_id)
    run_uuid = UUID(str(run_id))
    settings = get_settings()

    with get_session() as db:
        run = db.get(Run, run_uuid)
        if run is None:
            raise ValueError(f"Run not found: {run_id}")

        trace = db.get(Trace, run.trace_id)
        campaign = db.get(Campaign, run.campaign_id)
        if trace is None:
            raise ValueError(f"Trace not found for run {run_id}")
        if campaign is None:
            raise ValueError(f"Campaign not found for run {run_id}")
        tool_zones = _load_tool_zones(db, project_id=run.project_id)

        prior_summary = run.summary if isinstance(run.summary, dict) else {}

        templates = _load_run_templates(db, run=run)
        applied_templates_summary = [
            {
                "template_id": str(template.template_id),
                "name": template.name,
                "type": template.type,
            }
            for template in templates
        ]

        policy_pack: PolicyPack | None = None
        policy_pack_version: PolicyPackVersion | None = None
        if run.effective_policy_pack_version_id is not None:
            policy_pack_version = db.get(PolicyPackVersion, run.effective_policy_pack_version_id)
            if policy_pack_version is None:
                raise ValueError(f"Snapshotted policy pack version not found for run {run_id}")
        if run.policy_pack_id is not None:
            policy_pack = db.get(PolicyPack, run.policy_pack_id)
            if policy_pack is None:
                raise ValueError(f"Policy pack not found for run {run_id}")
            if policy_pack.project_id != run.project_id:
                raise ValueError(f"Policy pack project mismatch for run {run_id}")
            if policy_pack_version is not None and (
                policy_pack_version.policy_pack_id != policy_pack.policy_pack_id
            ):
                raise ValueError(f"Policy pack version mismatch for run {run_id}")

        if run.effective_policy_pack_version_id is not None and policy_pack is None:
            raise ValueError(f"Policy pack snapshot is set without policy pack for run {run_id}")

        if policy_pack is not None and policy_pack_version is None:
            policy_pack_version = _ensure_policy_pack_active_version(db, policy_pack=policy_pack)
            if policy_pack_version is not None:
                run.effective_policy_pack_version_id = policy_pack_version.version_id

        retry_policy = RetryPolicyConfig()
        adapter_config: ReplayAdapterConfig | None = None
        sanitizer_config: dict[str, Any] | None = None
        trace_hardening = prior_summary.get("trace_hardening")
        if isinstance(trace_hardening, dict):
            retry_config = trace_hardening.get("retry_policy")
            if isinstance(retry_config, dict):
                retry_policy = _merge_retry_policy(current=retry_policy, config=retry_config)
            schema_adapter_config = trace_hardening.get("schema_adapter")
            if isinstance(schema_adapter_config, dict):
                adapter_config = _merge_adapter_config(
                    current=adapter_config,
                    config=schema_adapter_config,
                )

        for template in templates:
            config = _template_config_dict(template)
            template_type = template.type
            if template_type == "retry_policy":
                retry_policy = _merge_retry_policy(current=retry_policy, config=config)
            elif template_type == "schema_adapter":
                adapter_config = _merge_adapter_config(current=adapter_config, config=config)
            elif template_type == "sanitizer":
                sanitizer_config = config
            elif template_type == "policy_pack":
                policy_override, policy_override_version = _resolve_policy_pack_override(
                    db, run=run, template=template
                )
                if policy_override is not None:
                    policy_pack = policy_override
                    policy_pack_version = policy_override_version

        template_confirmation_overrides = _collect_template_confirmation_overrides(templates)
        policy_document: dict[str, Any] | None = None
        policy_engine_name = "builtin"
        if policy_pack is not None and isinstance(policy_pack_version, PolicyPackVersion):
            if isinstance(policy_pack_version.policy, dict):
                policy_document = policy_pack_version.policy
        elif policy_pack is not None and isinstance(policy_pack.policy, dict):
            # Backward-compatible fallback for legacy rows without explicit versions.
            policy_document = policy_pack.policy
        if policy_pack is not None:
            policy_engine_name = (policy_pack.engine or "builtin").strip().lower()
        policy_token_field = approval_token_field(policy_document)

        mutation_pack: MutationPack | None = None
        mutation_pack_config: dict[str, Any] | None = None
        resolved_overlay_config = prior_summary.get("resolved_mutation_pack_config")
        if isinstance(resolved_overlay_config, dict):
            mutation_pack_config = resolved_overlay_config
        else:
            effective_mutation_pack_id = run.mutation_pack_id or campaign.mutation_pack_id
            if effective_mutation_pack_id is not None:
                mutation_pack = db.get(MutationPack, effective_mutation_pack_id)
                if mutation_pack is None:
                    raise ValueError(f"Mutation pack not found for run {run_id}")
                if mutation_pack.project_id != run.project_id:
                    raise ValueError(f"Mutation pack project mismatch for run {run_id}")
                mutation_pack_config = (
                    mutation_pack.config if isinstance(mutation_pack.config, dict) else {}
                )

        run.status = "running"
        db.commit()

        resolved_mutation_set = prior_summary.get("resolved_mutation_set")
        replay_seed_basis = prior_summary.get("replay_seed_basis")
        if not isinstance(replay_seed_basis, str) or not replay_seed_basis.strip():
            replay_seed_basis = None

        baseline_mutations = (
            iter_mutations(resolved_mutation_set)
            if resolved_mutation_set is not None
            else iter_mutations(campaign.mutation_set)
        )
        if resolved_mutation_set is None and _campaign_mutation_set_is_empty(campaign.mutation_set):
            seeded_baseline = _seed_baseline_mutations_from_trace(trace)
            if seeded_baseline:
                baseline_mutations = seeded_baseline
        attempt_repeats = _campaign_attempt_repeats(campaign)
        eval_checks = _campaign_eval_checks(campaign)
        total_attempts = len(baseline_mutations) * attempt_repeats
        passed_count = 0
        failed_count = 0
        unsafe_count = 0
        policy_denies = 0
        policy_requires_approval = 0
        policy_events_count = 0
        security_events_count = 0
        injection_blocks = 0
        injection_sanitizations = 0
        failure_type_counts: Counter[str] = Counter()
        severity_counts: Counter[str] = Counter()

        attempt_index = 0
        for baseline_index, mutation in enumerate(baseline_mutations):
            for repeat_index in range(attempt_repeats):
                attempt_id = uuid4()
                mutation_for_replay = _apply_template_confirmation_overrides(
                    mutation,
                    overrides=template_confirmation_overrides,
                )
                pending_policy_events: list[dict[str, Any]] = []
                if isinstance(policy_document, dict):
                    tool_name, policy_args, event_index = _extract_policy_inputs(
                        mutation_for_replay
                    )
                    _, commit_like = normalize_action(tool_name, policy_args)
                    policy_input = _build_policy_event_input(
                        tool_name=tool_name,
                        tool_args=policy_args,
                        run_id=run.run_id,
                        attempt_id=attempt_id,
                        project_id=run.project_id,
                        event_index=event_index,
                    )

                    event_decision = "allow"
                    event_reason = "allowed"
                    blocked_failure_reason: str | None = None
                    blocked_error_type = "PolicyDeniedError"
                    blocked_error_message = "Policy denied the tool call"

                    if policy_engine_name == "builtin":
                        evaluation = evaluate_policy(
                            policy_document,
                            tool_name=tool_name,
                            args=policy_args,
                            event_index=event_index,
                        )
                        event_decision = evaluation.decision
                        event_reason = evaluation.reason

                        if evaluation.decision == "require_approval":
                            token_present = has_confirmation_token(
                                policy_args,
                                token_field=policy_token_field,
                            )
                            if token_present:
                                event_decision = "allow"
                                event_reason = (
                                    f"{evaluation.reason}; approval token "
                                    f"'{policy_token_field}' provided"
                                )
                            else:
                                policy_requires_approval += 1
                                blocked_failure_reason = "policy_requires_approval"
                                blocked_error_type = "PolicyApprovalRequiredError"
                                blocked_error_message = evaluation.reason
                        elif evaluation.decision == "deny":
                            policy_denies += 1
                            blocked_failure_reason = "policy_denied"
                            blocked_error_type = "PolicyDeniedError"
                            blocked_error_message = evaluation.reason
                        else:
                            event_decision = "allow"
                            event_reason = "allowed by builtin policy"
                    elif policy_engine_name == "opa":
                        try:
                            opa_evaluation = evaluate_policy_with_opa(
                                policy_input=policy_input,
                                opa_url=settings.opa_url,
                                timeout_seconds=settings.opa_timeout_seconds,
                            )
                        except OPAUnavailableError as exc:
                            policy_denies += 1
                            event_decision = "deny"
                            event_reason = f"opa unavailable: {exc}"
                            blocked_failure_reason = "opa_unavailable"
                            blocked_error_type = "OPAUnavailableError"
                            blocked_error_message = "OPA policy decision service unavailable"
                        except OPAResponseError as exc:
                            policy_denies += 1
                            event_decision = "deny"
                            event_reason = f"opa response error: {exc}"
                            blocked_failure_reason = "opa_response_error"
                            blocked_error_type = "OPAResponseError"
                            blocked_error_message = "OPA returned an invalid response"
                        else:
                            event_decision = opa_evaluation.decision
                            event_reason = opa_evaluation.reason

                            if opa_evaluation.decision == "require_approval":
                                token_present = has_confirmation_token(
                                    policy_args,
                                    token_field=policy_token_field,
                                )
                                if token_present:
                                    event_decision = "allow"
                                    event_reason = (
                                        f"{opa_evaluation.reason}; "
                                        f"approval token '{policy_token_field}' provided"
                                    )
                                else:
                                    policy_requires_approval += 1
                                    blocked_failure_reason = "policy_requires_approval"
                                    blocked_error_type = "PolicyApprovalRequiredError"
                                    blocked_error_message = opa_evaluation.reason
                            elif opa_evaluation.decision == "deny":
                                policy_denies += 1
                                blocked_failure_reason = "policy_denied"
                                blocked_error_type = "PolicyDeniedError"
                                blocked_error_message = opa_evaluation.reason
                            else:
                                event_decision = "allow"
                                if not event_reason:
                                    event_reason = "allowed by OPA policy"
                    else:
                        policy_denies += 1
                        event_decision = "deny"
                        event_reason = (
                            f"policy engine '{policy_engine_name}' not recognized; "
                            "failing closed"
                        )
                        blocked_failure_reason = "policy_engine_unknown"
                        blocked_error_type = "PolicyEngineError"
                        blocked_error_message = f"Unknown policy engine '{policy_engine_name}'"

                    pending_policy_events.append(
                        {
                            "event_index": event_index,
                            "tool": tool_name,
                            "action": "commit" if commit_like else "tool_call",
                            "decision": event_decision,
                            "reason": event_reason,
                            "input": policy_input,
                        }
                    )
                    if blocked_failure_reason is not None:
                        mutation_for_replay = _policy_blocked_mutation(
                            mutation_for_replay,
                            failure_reason=blocked_failure_reason,
                            error_type=blocked_error_type,
                            error_message=blocked_error_message,
                        )

                outcome = build_attempt_replay_outcome(
                    run_id=run.run_id,
                    attempt_id=attempt_id,
                    mutation=mutation_for_replay,
                    trace_s3_key=trace.s3_key,
                    default_mutation_id=f"mutation-{baseline_index}-{repeat_index}",
                    adapter_config=adapter_config,
                    retry_policy=retry_policy,
                )
                result = outcome.result
                failure_reason = outcome.failure_reason
                first_failure_event_index = outcome.first_failure_event_index
                first_failure_tool = outcome.first_failure_tool
                timeline_artifact = outcome.timeline_artifact
                mutation_seed: int | None = None
                mutation_trace: dict[str, Any] | None = None
                mutation_forced_failure = False

                if mutation_pack_config is not None:
                    mutation_result = apply_mutation_pack(
                        mutation_pack_config,
                        run_id=run.run_id,
                        attempt_id=attempt_id,
                        attempt_index=attempt_index,
                        timeline_artifact=timeline_artifact,
                        seed_basis=replay_seed_basis,
                    )
                    mutation_seed = mutation_result.seed
                    mutation_trace = mutation_result.mutation_trace
                    timeline_artifact = mutation_result.timeline_artifact

                    if result == "passed" and mutation_result.forced_failure_reason is not None:
                        result = "failed"
                        failure_reason = mutation_result.forced_failure_reason
                        first_failure_event_index = mutation_result.first_failure_event_index
                        first_failure_tool = mutation_result.first_failure_tool
                        mutation_forced_failure = True

                _apply_schema_adapter_to_timeline(
                    timeline_artifact=timeline_artifact,
                    adapter_config=adapter_config,
                )

                if mutation_forced_failure and result == "failed":
                    (
                        recovered,
                        timeline_artifact,
                        recovered_failure_reason,
                        recovered_failure_event_index,
                        recovered_failure_tool,
                    ) = _recover_mutation_forced_failure_with_retry(
                        timeline_artifact=timeline_artifact,
                        mutation_trace=mutation_trace,
                        failure_reason=failure_reason,
                        first_failure_event_index=first_failure_event_index,
                        first_failure_tool=first_failure_tool,
                        retry_policy=retry_policy,
                    )
                    if recovered:
                        result = "passed"
                        failure_reason = recovered_failure_reason
                        first_failure_event_index = recovered_failure_event_index
                        first_failure_tool = recovered_failure_tool

                (
                    timeline_artifact,
                    pending_security_events,
                    attempt_injection_blocks,
                    attempt_injection_sanitizations,
                    injection_failure_reason,
                    injection_failure_event_index,
                    injection_failure_tool,
                ) = _enforce_injection_firewall(
                    timeline_artifact=timeline_artifact,
                    tool_zones=tool_zones,
                )
                injection_blocks += attempt_injection_blocks
                injection_sanitizations += attempt_injection_sanitizations

                if result == "passed" and injection_failure_reason is not None:
                    result = "failed"
                    failure_reason = injection_failure_reason
                    first_failure_event_index = injection_failure_event_index
                    first_failure_tool = injection_failure_tool

                timeline_artifact = _apply_sanitizer_to_timeline(
                    timeline_artifact,
                    sanitizer_config,
                )
                (
                    result,
                    failure_reason,
                    first_failure_event_index,
                    first_failure_tool,
                    timeline_artifact,
                ) = _apply_eval_checks_to_attempt(
                    checks=eval_checks,
                    result=result,
                    failure_reason=failure_reason,
                    first_failure_event_index=first_failure_event_index,
                    first_failure_tool=first_failure_tool,
                    timeline_artifact=timeline_artifact,
                )

                artifact_key = f"runs/{run.run_id}/attempts/{attempt_id}.timeline.json"
                put_json_object(artifact_key, timeline_artifact)
                tools_touched, tool_call_counts = _extract_tool_usage_metadata(timeline_artifact)
                recorded_mutation_id = _recorded_attempt_mutation_id(
                    default_mutation_id=outcome.mutation_id,
                    mutation_trace=mutation_trace,
                    failure_reason=failure_reason,
                    first_failure_tool=first_failure_tool,
                )
                counterfactual_mutation = _counterfactual_mutation_input(
                    baseline_mutation=mutation_for_replay,
                    timeline_artifact=timeline_artifact,
                    mutation_trace=mutation_trace,
                    attempt_mutation_id=recorded_mutation_id,
                    failure_reason=failure_reason,
                    first_failure_tool=first_failure_tool,
                    first_failure_event_index=first_failure_event_index,
                )

                attempt_record = ReplayAttempt(
                    attempt_id=attempt_id,
                    project_id=run.project_id,
                    run_id=run.run_id,
                    mutation_id=recorded_mutation_id,
                    result=result,
                    failure_reason=failure_reason,
                    first_failure_event_index=first_failure_event_index,
                    first_failure_tool=first_failure_tool,
                    seed=mutation_seed,
                    mutation_trace=mutation_trace,
                    tools_touched=tools_touched,
                    tool_call_counts=tool_call_counts,
                    artifacts_s3_key=artifact_key,
                )
                db.add(attempt_record)
                db.flush()
                persist_attempt_trace_steps(
                    db,
                    project_id=run.project_id,
                    trace_id=run.trace_id,
                    run_id=run.run_id,
                    attempt_id=attempt_record.attempt_id,
                    timeline_artifact=timeline_artifact,
                    mutation_trace=mutation_trace,
                )

                for event_payload in pending_policy_events:
                    db.add(
                        PolicyEvent(
                            policy_event_id=uuid4(),
                            run_id=run.run_id,
                            attempt_id=attempt_record.attempt_id,
                            event_index=event_payload["event_index"],
                            tool=event_payload["tool"],
                            action=event_payload["action"],
                            decision=event_payload["decision"],
                            reason=event_payload["reason"],
                            input=event_payload["input"],
                        )
                    )
                policy_events_count += len(pending_policy_events)

                for event_payload in pending_security_events:
                    db.add(
                        SecurityEvent(
                            security_event_id=uuid4(),
                            run_id=run.run_id,
                            attempt_id=attempt_record.attempt_id,
                            event_index=event_payload["event_index"],
                            tool=event_payload["tool"],
                            zone=event_payload["zone"],
                            risk_score=event_payload["risk_score"],
                            action=event_payload["action"],
                            matches=event_payload["matches"],
                        )
                    )
                security_events_count += len(pending_security_events)

                if result == "failed":
                    classification = classify_attempt_failure(
                        FailureClassificationInput(
                            failure_reason=failure_reason,
                            first_failure_tool=first_failure_tool,
                            first_failure_event_index=first_failure_event_index,
                            timeline_artifact=timeline_artifact,
                            mutation_trace=mutation_trace,
                            policy_events=pending_policy_events,
                            security_events=pending_security_events,
                            mutation_name=recorded_mutation_id,
                        )
                    )
                    db.add(
                        Failure(
                            failure_id=uuid4(),
                            project_id=run.project_id,
                            run_id=run.run_id,
                            campaign_id=run.campaign_id,
                            trace_id=run.trace_id,
                            mutation_name=recorded_mutation_id,
                            failure_type=classification.failure_type,
                            severity=classification.severity,
                            description=classification.description,
                            failure_metadata=classification.metadata,
                        )
                    )
                    failure_type_counts[classification.failure_type] += 1
                    severity_counts[classification.severity] += 1
                    policy_irreversible_tools: frozenset[str] | None = None
                    if isinstance(policy_document, dict):
                        irreversible_obj = policy_document.get("irreversible")
                        if isinstance(irreversible_obj, dict):
                            raw_tools = irreversible_obj.get("tools")
                            if isinstance(raw_tools, list):
                                policy_irreversible_tools = frozenset(
                                    t for t in raw_tools if isinstance(t, str) and t.strip()
                                )
                    for counterfactual in run_counterfactual_replays(
                        run_id=run.run_id,
                        attempt=attempt_record,
                        mutation=counterfactual_mutation,
                        trace_s3_key=trace.s3_key,
                        policy_irreversible_tools=policy_irreversible_tools,
                    ):
                        db.add(
                            Counterfactual(
                                counterfactual_id=uuid4(),
                                project_id=run.project_id,
                                attempt_id=attempt_record.attempt_id,
                                strategy=counterfactual.strategy,
                                result=counterfactual.result,
                                failure_reason=counterfactual.failure_reason,
                                metrics=counterfactual.metrics,
                                diff=counterfactual.diff,
                            )
                        )
                if result == "passed":
                    passed_count += 1
                else:
                    failed_count += 1
                    if _is_unsafe_failure_reason(failure_reason):
                        unsafe_count += 1
                attempt_index += 1

        prior_summary = run.summary if isinstance(run.summary, dict) else {}
        ci_thresholds = prior_summary.get("ci_thresholds")
        ci_batch_id = prior_summary.get("ci_batch_id")
        github_context = prior_summary.get("github_context")
        github_reporting = prior_summary.get("github_reporting")
        resolved_mutation_set = prior_summary.get("resolved_mutation_set")
        reliability = calculate_reliability_score(
            critical=severity_counts.get("critical", 0),
            high=severity_counts.get("high", 0),
            medium=severity_counts.get("medium", 0),
        )

        run.status = "completed"
        run.summary = {
            "timeline_version": "0.1",
            "attempt_count": total_attempts,
            "passed_count": passed_count,
            "failures": failed_count,
            "failed_count": failed_count,
            "pass_rate": round((passed_count / total_attempts), 4) if total_attempts else 0.0,
            "unsafe_attempts": unsafe_count,
            "unsafe_count": unsafe_count,
            "policy_violations_total": policy_denies + policy_requires_approval,
            "policy_denies": policy_denies,
            "policy_requires_approval": policy_requires_approval,
            # Backward-compatible aliases.
            "policy_denied_count": policy_denies,
            "policy_requires_approval_count": policy_requires_approval,
            "policy_events_count": policy_events_count,
            "security_events_count": security_events_count,
            "injection_blocks": injection_blocks,
            "injection_sanitizations": injection_sanitizations,
            "reliability_score": reliability["score"],
            "reliability_status": reliability["status"],
            "failure_breakdown": _failure_breakdown_items(failure_type_counts),
            "failure_severity_breakdown": dict(severity_counts),
            "classified_failures": sum(failure_type_counts.values()),
            "applied_templates": applied_templates_summary,
            "applied_template_count": len(applied_templates_summary),
            "template_overrides": {
                "retry_policy": {
                    "max_retries": retry_policy.max_retries,
                    "backoff_ms": retry_policy.backoff_ms,
                },
                "schema_adapter_enabled": adapter_config is not None,
                "sanitizer_enabled": sanitizer_config is not None,
                "effective_policy_pack_id": (
                    str(policy_pack.policy_pack_id) if policy_pack is not None else None
                ),
                "effective_policy_pack_version_id": (
                    str(policy_pack_version.version_id)
                    if isinstance(policy_pack_version, PolicyPackVersion)
                    else None
                ),
            },
        }
        if ci_thresholds is not None:
            run.summary["ci_thresholds"] = ci_thresholds
        if isinstance(ci_batch_id, str) and ci_batch_id.strip():
            run.summary["ci_batch_id"] = ci_batch_id
        if isinstance(github_context, dict):
            run.summary["github_context"] = github_context
        if isinstance(github_reporting, dict):
            run.summary["github_reporting"] = github_reporting
        if isinstance(resolved_mutation_set, list):
            run.summary["resolved_mutation_set"] = resolved_mutation_set
        if replay_seed_basis is not None:
            run.summary["replay_seed_basis"] = replay_seed_basis
        if isinstance(trace_hardening, dict):
            run.summary["trace_hardening"] = trace_hardening
        template_application = prior_summary.get("template_application")
        if isinstance(template_application, dict):
            run.summary["template_application"] = template_application
        run_completed_event = _record_run_completed_audit_event(db, run=run)
        db.commit()
        _dispatch_project_webhooks_for_event(
            db,
            project_id=run.project_id,
            event_type=run_completed_event.event_type,
            data=(
                run_completed_event.event_metadata
                if isinstance(run_completed_event.event_metadata, dict)
                else {}
            ),
            created_at=run_completed_event.created_at,
        )
        db.commit()

    logger.info("Completed run %s", run_id)


def _consume_wallet_credits(wallet: CreditWallet, *, amount: int) -> None:
    if amount <= 0:
        return
    if wallet.balance < amount:
        raise ValueError("Insufficient wallet balance for scheduled campaign debit")

    # Scheduled runs must debit the same buckets as API-triggered runs.
    remaining = amount
    from_monthly = min(int(wallet.monthly_credits), remaining)
    wallet.monthly_credits -= from_monthly
    remaining -= from_monthly
    if remaining > 0:
        wallet.topup_credits -= remaining
    wallet.balance = wallet.monthly_credits + wallet.topup_credits


def execute_scheduled_campaign(scheduled_campaign_id: str) -> None:
    """Credit-checked execution of a scheduled campaign run pack."""
    sc_uuid = UUID(scheduled_campaign_id)
    logger.info("Executing scheduled campaign %s", scheduled_campaign_id)

    with get_session() as db:
        sc = db.get(ScheduledCampaign, sc_uuid)
        if sc is None or not sc.enabled:
            logger.warning("Scheduled campaign %s not found or disabled", scheduled_campaign_id)
            return

        campaign = db.get(Campaign, sc.campaign_id)
        mutation_pack = db.get(MutationPack, sc.mutation_pack_id)
        if campaign is None or mutation_pack is None:
            logger.error(
                "Missing campaign or mutation_pack for scheduled campaign %s",
                scheduled_campaign_id,
            )
            return

        project = db.get(Project, sc.project_id)
        if project is None or project.owner_id is None:
            logger.error(
                "Project or owner not found for scheduled campaign %s", scheduled_campaign_id
            )
            return

        wallet = db.scalar(
            select(CreditWallet).where(CreditWallet.user_id == project.owner_id).with_for_update()
        )
        credit_cost = int(getattr(mutation_pack, "credit_cost", 20))

        if wallet is None or wallet.balance < credit_cost:
            logger.info(
                "Skipping scheduled campaign %s — insufficient credits (balance=%s, cost=%s)",
                scheduled_campaign_id,
                wallet.balance if wallet else 0,
                credit_cost,
            )
            sc.last_run_status = "skipped_insufficient_credits"
            audit = AuditEvent(
                audit_event_id=uuid4(),
                project_id=sc.project_id,
                event_type="campaign_skipped_insufficient_credits",
                actor="scheduler",
                event_metadata={
                    "scheduled_campaign_id": scheduled_campaign_id,
                    "campaign_id": str(sc.campaign_id),
                    "mutation_pack": mutation_pack.name,
                    "balance": wallet.balance if wallet else 0,
                    "credit_cost": credit_cost,
                },
            )
            db.add(sc)
            db.add(audit)
            db.commit()
            return

        _consume_wallet_credits(wallet, amount=credit_cost)
        db.add(
            CreditTransaction(
                credit_transaction_id=uuid4(),
                user_id=project.owner_id,
                amount=-credit_cost,
                type="usage",
                reason=f"scheduled_pack_run:{mutation_pack.name}",
            )
        )

        # Build synthetic trace payload (mirrors run_service._build_synthetic_campaign_trace_payload)
        task_name = campaign.name.strip() or "campaign.run_pack"
        trace_payload: dict[str, Any] = {
            "trace_version": "0.1",
            "source": "campaign.run_pack",
            "task": {
                "name": task_name,
                "input": {
                    "campaign_id": str(campaign.campaign_id),
                    "campaign_name": campaign.name,
                    "mutation_pack": mutation_pack.name,
                },
            },
            "events": [
                {
                    "index": 0,
                    "type": "tool_call",
                    "tool": "campaign.load",
                    "args": {
                        "campaign_id": str(campaign.campaign_id),
                        "mutation_pack": mutation_pack.name,
                    },
                },
                {
                    "index": 1,
                    "type": "tool_result",
                    "tool": "campaign.load",
                    "result": {
                        "ok": True,
                        "campaign_name": campaign.name,
                        "mutation_pack": mutation_pack.name,
                    },
                },
            ],
        }

        trace_id = uuid4()
        s3_key = f"traces/{sc.project_id}/{trace_id}.json"
        put_json_object(s3_key, trace_payload)

        trace = Trace(
            trace_id=trace_id,
            project_id=sc.project_id,
            source="campaign.run_pack",
            trace_version="0.1",
            validation_status="valid",
            s3_key=s3_key,
        )
        db.add(trace)
        db.flush()

        run_id = uuid4()
        run = Run(
            run_id=run_id,
            project_id=sc.project_id,
            trace_id=trace_id,
            campaign_id=sc.campaign_id,
            mutation_pack_id=sc.mutation_pack_id,
            status="queued",
        )
        db.add(run)

        sc.last_run_at = datetime.now(UTC)
        sc.last_run_status = "success"
        db.add(sc)
        db.commit()

    # Enqueue the actual run execution (outside the DB transaction)
    settings = get_settings()
    connection = redis.from_url(settings.redis_url)
    queue = Queue("sepurux", connection=connection)
    queue.enqueue("worker.execute_run", str(run_id))
    logger.info("Scheduled campaign %s enqueued run %s", scheduled_campaign_id, run_id)


def dispatch_scheduled_campaigns() -> None:
    """Check all enabled scheduled campaigns and enqueue any that are due. Run every minute."""
    try:
        from croniter import croniter  # type: ignore[import-untyped]
    except ImportError:
        logger.error("croniter not installed; scheduled campaigns cannot be dispatched")
        return

    now = datetime.now(UTC)
    settings = get_settings()
    connection = redis.from_url(settings.redis_url)
    queue = Queue("sepurux", connection=connection)

    with get_session() as db:
        scheduled = list(
            db.scalars(select(ScheduledCampaign).where(ScheduledCampaign.enabled.is_(True)))
        )

    for sc in scheduled:
        try:
            ref_time = sc.last_run_at or sc.created_at
            cron = croniter(sc.cron_schedule, ref_time)
            next_due = cron.get_next(datetime)
            if next_due <= now:
                with get_session() as db:
                    record = db.get(ScheduledCampaign, sc.scheduled_campaign_id)
                    if record is None or not record.enabled:
                        continue
                    record.last_run_at = now
                    db.commit()
                queue.enqueue("worker.execute_scheduled_campaign", str(sc.scheduled_campaign_id))
                logger.info("Dispatched scheduled campaign %s", sc.scheduled_campaign_id)
        except Exception:
            logger.exception("Error dispatching scheduled campaign %s", sc.scheduled_campaign_id)


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    settings = get_settings()
    connection = redis.from_url(settings.redis_url)
    priority_queue = Queue("sepurux-priority", connection=connection)
    default_queue = Queue("sepurux", connection=connection)
    worker = Worker([priority_queue, default_queue], connection=connection)
    worker.work()


if __name__ == "__main__":
    main()
