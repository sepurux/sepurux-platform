from __future__ import annotations

from dataclasses import dataclass
from fnmatch import fnmatchcase
from typing import Any, Literal

PolicyDecision = Literal["allow", "deny", "require_approval"]


@dataclass(frozen=True)
class PolicyEvaluation:
    decision: PolicyDecision
    reason: str
    matched_rule_index: int | None = None


def evaluate_policy(policy: Any, *, tool: str, args: dict[str, Any] | None) -> PolicyEvaluation:
    policy_obj = policy if isinstance(policy, dict) else {}
    rules = policy_obj.get("rules")
    rule_items = rules if isinstance(rules, list) else []
    approval = policy_obj.get("approval")
    approval_obj = approval if isinstance(approval, dict) else {}
    token_field = approval_obj.get("token_field")
    token_field_name = (
        token_field if isinstance(token_field, str) and token_field else "confirmation_token"
    )

    for index, item in enumerate(rule_items):
        if not isinstance(item, dict):
            continue
        if not _rule_matches_tool(item, tool=tool):
            continue
        effect = item.get("effect")
        if effect not in {"allow", "deny", "require_approval"}:
            continue

        reason = _rule_reason(item, effect=effect, tool=tool)
        if effect == "require_approval":
            if _has_approval_token(args=args, token_field=token_field_name):
                return PolicyEvaluation(
                    decision="allow",
                    reason=f"approval token accepted via '{token_field_name}'",
                    matched_rule_index=index,
                )
            return PolicyEvaluation(
                decision="require_approval",
                reason=reason,
                matched_rule_index=index,
            )
        return PolicyEvaluation(decision=effect, reason=reason, matched_rule_index=index)

    unknown_tools_default = _unknown_tools_default(policy_obj)
    if unknown_tools_default == "deny":
        return PolicyEvaluation(
            decision="deny",
            reason=f"unknown tool '{tool}' denied by defaults.unknown_tools",
            matched_rule_index=None,
        )
    return PolicyEvaluation(
        decision="allow",
        reason=f"unknown tool '{tool}' allowed by defaults.unknown_tools",
        matched_rule_index=None,
    )


def _rule_matches_tool(rule: dict[str, Any], *, tool: str) -> bool:
    match = rule.get("match")
    if not isinstance(match, dict):
        return False
    tool_pattern = match.get("tool")
    if not isinstance(tool_pattern, str) or not tool_pattern:
        return False
    if "*" in tool_pattern:
        return fnmatchcase(tool, tool_pattern)
    return tool == tool_pattern


def _has_approval_token(*, args: dict[str, Any] | None, token_field: str) -> bool:
    if not isinstance(args, dict):
        return False
    value = args.get(token_field)
    return bool(value)


def _unknown_tools_default(policy: dict[str, Any]) -> Literal["allow", "deny"]:
    defaults = policy.get("defaults")
    defaults_obj = defaults if isinstance(defaults, dict) else {}
    unknown_tools = defaults_obj.get("unknown_tools")
    if unknown_tools == "deny":
        return "deny"
    return "allow"


def _rule_reason(rule: dict[str, Any], *, effect: str, tool: str) -> str:
    reason = rule.get("reason")
    if isinstance(reason, str) and reason.strip():
        return reason
    if effect == "deny":
        return f"tool '{tool}' denied by matching rule"
    if effect == "require_approval":
        return f"tool '{tool}' requires approval token"
    return f"tool '{tool}' explicitly allowed by matching rule"
