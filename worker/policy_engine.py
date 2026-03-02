from __future__ import annotations

from dataclasses import dataclass
from fnmatch import fnmatchcase
from typing import Any, Literal, TypedDict

PolicyDecision = Literal["allow", "deny", "require_approval"]

_COMMIT_ACTION_VALUES = {"commit", "final", "finalize", "apply"}
_CONFIRM_ACTION_VALUES = {"commit", "finalize", "apply"}


@dataclass(frozen=True)
class PolicyEvaluation:
    decision: PolicyDecision
    reason: str
    normalized_tool_name: str
    is_commit_like: bool
    matched_rule_index: int | None = None


class _SafeActionDecision(TypedDict):
    decision: PolicyDecision
    reason: str


def approval_token_field(policy: Any) -> str:
    policy_obj = policy if isinstance(policy, dict) else {}
    approval_obj = policy_obj.get("approval")
    if isinstance(approval_obj, dict):
        field = approval_obj.get("token_field")
        if isinstance(field, str) and field.strip():
            return field.strip()
    return "confirmation_token"


def normalize_action(tool_name: str, args: dict[str, Any] | None) -> tuple[str, bool]:
    raw_tool = (tool_name or "").strip()
    normalized_tool = raw_tool
    commit_like = False

    lower_tool = raw_tool.lower()
    if lower_tool.endswith("(commit)"):
        normalized_tool = raw_tool[: -len("(commit)")].strip()
        commit_like = True
    elif lower_tool.endswith("_commit"):
        normalized_tool = raw_tool[: -len("_commit")]
        commit_like = True

    args_obj = args if isinstance(args, dict) else {}
    if args_obj.get("commit") is True:
        commit_like = True

    mode_value = args_obj.get("mode")
    if isinstance(mode_value, str) and mode_value.lower() in _COMMIT_ACTION_VALUES:
        commit_like = True

    action_value = args_obj.get("action")
    if isinstance(action_value, str) and action_value.lower() in _CONFIRM_ACTION_VALUES:
        commit_like = True

    if args_obj.get("finalize") is True:
        commit_like = True

    if "dry_run" in args_obj and "confirm" in args_obj:
        if args_obj.get("dry_run") is False and args_obj.get("confirm") is True:
            commit_like = True

    return normalized_tool or raw_tool or "replay.execute", commit_like


def has_confirmation_token(
    args: dict[str, Any] | None, *, token_field: str = "confirmation_token"
) -> bool:
    args_obj = args if isinstance(args, dict) else {}
    token_value = args_obj.get(token_field)
    if isinstance(token_value, str) and token_value.strip():
        return True
    if token_value is not None and bool(token_value):
        return True
    return bool(args_obj.get("confirmation_token") or args_obj.get("approval_token"))


def evaluate_policy(
    policy: Any,
    *,
    tool_name: str,
    args: dict[str, Any] | None,
    event_index: int | None = None,
) -> PolicyEvaluation:
    policy_obj = policy if isinstance(policy, dict) else {}
    normalized_tool_name, is_commit_like = normalize_action(tool_name, args)

    irreversible_decision = _irreversible_gate(
        policy_obj=policy_obj,
        normalized_tool_name=normalized_tool_name,
        is_commit_like=is_commit_like,
    )
    if irreversible_decision is not None:
        return PolicyEvaluation(
            decision=irreversible_decision["decision"],
            reason=irreversible_decision["reason"],
            normalized_tool_name=normalized_tool_name,
            is_commit_like=is_commit_like,
            matched_rule_index=None,
        )

    rules = policy_obj.get("rules")
    rule_items = rules if isinstance(rules, list) else []
    for index, item in enumerate(rule_items):
        if not isinstance(item, dict):
            continue
        if not _rule_matches(
            item,
            normalized_tool_name=normalized_tool_name,
            is_commit_like=is_commit_like,
            args=args,
            event_index=event_index,
        ):
            continue
        effect = item.get("effect")
        if effect not in {"allow", "deny", "require_approval"}:
            continue

        return PolicyEvaluation(
            decision=effect,
            reason=_rule_reason(item, effect=effect, tool=normalized_tool_name),
            normalized_tool_name=normalized_tool_name,
            is_commit_like=is_commit_like,
            matched_rule_index=index,
        )

    unknown_tools_default = _unknown_tools_default(policy_obj)
    if unknown_tools_default == "deny":
        return PolicyEvaluation(
            decision="deny",
            reason=f"unknown tool '{normalized_tool_name}' denied by defaults.unknown_tools",
            normalized_tool_name=normalized_tool_name,
            is_commit_like=is_commit_like,
            matched_rule_index=None,
        )
    return PolicyEvaluation(
        decision="allow",
        reason=f"unknown tool '{normalized_tool_name}' allowed by defaults.unknown_tools",
        normalized_tool_name=normalized_tool_name,
        is_commit_like=is_commit_like,
        matched_rule_index=None,
    )


def _safe_action_gate(
    *,
    normalized_tool_name: str,
    is_commit_like: bool,
) -> _SafeActionDecision | None:
    if normalized_tool_name == "payments.refund":
        return {
            "decision": "require_approval",
            "reason": "payments.refund requires explicit approval token",
        }
    if normalized_tool_name == "jira.create_issue" and is_commit_like:
        return {
            "decision": "require_approval",
            "reason": "jira.create_issue commit-like action requires explicit approval token",
        }
    return None


def _irreversible_gate(
    *,
    policy_obj: dict[str, Any],
    normalized_tool_name: str,
    is_commit_like: bool,
) -> _SafeActionDecision | None:
    irreversible_tools = policy_obj.get("irreversible_tools")
    if isinstance(irreversible_tools, list):
        for item in irreversible_tools:
            if not isinstance(item, str):
                continue
            candidate = item.strip()
            if not candidate:
                continue
            normalized_candidate, candidate_commit_like = normalize_action(candidate, args=None)
            if normalized_candidate != normalized_tool_name:
                continue
            if candidate_commit_like and not is_commit_like:
                continue
            return {
                "decision": "require_approval",
                "reason": _irreversible_reason(
                    raw_entry=candidate,
                    normalized_tool_name=normalized_tool_name,
                    candidate_commit_like=candidate_commit_like,
                ),
            }
        return None

    # Backward compatibility for existing policy packs created before irreversible_tools.
    return _safe_action_gate(
        normalized_tool_name=normalized_tool_name,
        is_commit_like=is_commit_like,
    )


def _irreversible_reason(
    *,
    raw_entry: str,
    normalized_tool_name: str,
    candidate_commit_like: bool,
) -> str:
    if candidate_commit_like:
        return f"{normalized_tool_name} commit-like action requires explicit approval token"
    return f"{raw_entry} requires explicit approval token"


def _rule_matches(
    rule: dict[str, Any],
    *,
    normalized_tool_name: str,
    is_commit_like: bool,
    args: dict[str, Any] | None,
    event_index: int | None,
) -> bool:
    match = rule.get("match")
    if not isinstance(match, dict):
        return False

    tool_pattern = match.get("tool")
    if isinstance(tool_pattern, str) and tool_pattern:
        if "*" in tool_pattern:
            if not fnmatchcase(normalized_tool_name, tool_pattern):
                return False
        elif normalized_tool_name != tool_pattern:
            return False

    if "commit_like" in match and bool(match.get("commit_like")) != is_commit_like:
        return False

    expected_event_index = match.get("event_index")
    if expected_event_index is not None:
        if not isinstance(expected_event_index, int) or expected_event_index != event_index:
            return False

    args_match = match.get("args")
    if args_match is not None:
        if not isinstance(args_match, dict):
            return False
        args_obj = args if isinstance(args, dict) else {}
        if not _is_subset(expected=args_match, actual=args_obj):
            return False

    return True


def _is_subset(*, expected: Any, actual: Any) -> bool:
    if isinstance(expected, dict):
        if not isinstance(actual, dict):
            return False
        for key, expected_value in expected.items():
            if key not in actual:
                return False
            if not _is_subset(expected=expected_value, actual=actual[key]):
                return False
        return True
    return bool(expected == actual)


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
