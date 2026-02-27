from __future__ import annotations

from policy_engine import evaluate_policy


def test_evaluate_policy_allows_exact_rule_match() -> None:
    policy = {
        "version": "0.1",
        "defaults": {"unknown_tools": "deny"},
        "rules": [
            {"match": {"tool": "payments.refund"}, "effect": "allow"},
        ],
    }

    evaluation = evaluate_policy(policy, tool="payments.refund", args={"amount": 10})

    assert evaluation.decision == "allow"
    assert "allowed" in evaluation.reason


def test_evaluate_policy_denies_wildcard_rule_match() -> None:
    policy = {
        "version": "0.1",
        "defaults": {"unknown_tools": "allow"},
        "rules": [
            {
                "match": {"tool": "db.write.*"},
                "effect": "deny",
                "reason": "no writes in replay",
            }
        ],
    }

    evaluation = evaluate_policy(policy, tool="db.write.users", args={"name": "alice"})

    assert evaluation.decision == "deny"
    assert evaluation.reason == "no writes in replay"


def test_evaluate_policy_requires_approval_without_token() -> None:
    policy = {
        "version": "0.1",
        "defaults": {"unknown_tools": "allow"},
        "rules": [
            {"match": {"tool": "payments.refund"}, "effect": "require_approval"},
        ],
        "approval": {"token_field": "confirmation_token"},
    }

    missing_token = evaluate_policy(policy, tool="payments.refund", args={"amount": 99})
    present_token = evaluate_policy(
        policy,
        tool="payments.refund",
        args={"amount": 99, "confirmation_token": "ok"},
    )

    assert missing_token.decision == "require_approval"
    assert "requires approval" in missing_token.reason
    assert present_token.decision == "allow"
