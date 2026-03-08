from __future__ import annotations

from policy_engine import evaluate_policy, normalize_action


def test_normalize_action_marks_commit_like_for_parenthesized_tool_name() -> None:
    normalized_tool, commit_like = normalize_action("jira.create_issue(commit)", args={})

    assert normalized_tool == "jira.create_issue"
    assert commit_like is True


def test_normalize_action_marks_commit_like_for_commit_tool_suffix() -> None:
    normalized_tool, commit_like = normalize_action("jira.create_issue_commit", args={})

    assert normalized_tool == "jira.create_issue"
    assert commit_like is True


def test_normalize_action_marks_commit_like_for_args_commit_true() -> None:
    normalized_tool, commit_like = normalize_action("jira.create_issue", args={"commit": True})

    assert normalized_tool == "jira.create_issue"
    assert commit_like is True


def test_normalize_action_marks_commit_like_for_args_mode_commit() -> None:
    normalized_tool, commit_like = normalize_action("jira.create_issue", args={"mode": "commit"})

    assert normalized_tool == "jira.create_issue"
    assert commit_like is True


def test_normalize_action_marks_commit_like_for_args_action_commit() -> None:
    normalized_tool, commit_like = normalize_action("jira.create_issue", args={"action": "commit"})

    assert normalized_tool == "jira.create_issue"
    assert commit_like is True


def test_normalize_action_marks_commit_like_for_args_finalize_true() -> None:
    normalized_tool, commit_like = normalize_action("jira.create_issue", args={"finalize": True})

    assert normalized_tool == "jira.create_issue"
    assert commit_like is True


def test_normalize_action_marks_commit_like_for_dry_run_false_and_confirm_true() -> None:
    normalized_tool, commit_like = normalize_action(
        "jira.create_issue",
        args={"dry_run": False, "confirm": True},
    )

    assert normalized_tool == "jira.create_issue"
    assert commit_like is True


def test_evaluate_policy_supports_wildcard_and_args_subset_match() -> None:
    policy = {
        "version": "0.1",
        "defaults": {"unknown_tools": "allow"},
        "rules": [
            {
                "match": {
                    "tool": "db.write.*",
                    "args": {"table": "users", "mode": "shadow"},
                },
                "effect": "deny",
                "reason": "no writes in replay",
            }
        ],
    }

    evaluation = evaluate_policy(
        policy,
        tool_name="db.write.users",
        args={"table": "users", "mode": "shadow", "dry_run": True},
    )

    assert evaluation.decision == "deny"
    assert evaluation.reason == "no writes in replay"


def test_evaluate_policy_irreversible_tools_gate_blocks_jira_commit_like_without_token() -> None:
    policy = {
        "version": "0.1",
        "defaults": {"unknown_tools": "allow"},
        "irreversible": {
            "tools": [
                "payments.refund",
                "jira.create_issue(commit)",
                "jira.create_issue_commit",
            ]
        },
        "approval": {"token_field": "confirmation_token"},
        "opa": {
            "package": "sepurux.policy",
            "query": "data.sepurux.policy.decision",
        },
    }

    commit_like = evaluate_policy(
        policy,
        tool_name="jira.create_issue(commit)",
        args={"title": "Issue from replay"},
    )
    draft = evaluate_policy(
        policy,
        tool_name="jira.create_issue",
        args={"title": "Draft issue"},
    )

    assert commit_like.decision == "require_approval"
    assert "requires explicit approval token" in commit_like.reason
    assert draft.decision == "allow"
