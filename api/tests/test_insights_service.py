from __future__ import annotations

from uuid import uuid4

from app.services.insights_service import build_run_insights


def _base_inputs() -> dict[str, object]:
    return {
        "run_id": uuid4(),
        "failed_attempts": 0,
        "failures_by_tool": [],
        "failures_by_mutation": [],
        "top_failure_reasons": [],
        "most_lethal_mutations": [],
        "policy_violations_total": 0,
        "policy_requires_approval": 0,
        "policy_blocked_tools": [],
        "counterfactual_total": 0,
        "counterfactual_passed": 0,
    }


def test_policy_violations_generate_token_recommendation() -> None:
    payload = _base_inputs()
    payload.update(
        {
            "policy_violations_total": 3,
            "policy_requires_approval": 2,
            "policy_blocked_tools": [{"tool": "payments.refund", "count": 2}],
        }
    )

    insights = build_run_insights(**payload)
    assert insights
    ids = [item["id"] for item in insights]
    assert "insight.approval_tokens.irreversible_tools" in ids


def test_schema_lethal_generates_schema_adapter_recommendation() -> None:
    payload = _base_inputs()
    payload.update(
        {
            "failed_attempts": 6,
            "most_lethal_mutations": [
                {
                    "mutation_id": "schema.drop_field",
                    "attempts_hit": 8,
                    "failures": 4,
                    "failure_rate_when_hit": 0.5,
                    "top_tools": [{"tool": "jira.create_issue", "count": 3}],
                    "top_reasons": [{"reason": "timeout", "count": 2}],
                }
            ],
            "top_failure_reasons": [{"reason": "timeout", "count": 3, "pct": 0.5}],
        }
    )

    insights = build_run_insights(**payload)
    schema_insights = [
        item for item in insights if item["id"].startswith("insight.schema_adapter.")
    ]
    assert len(schema_insights) == 1
    assert "schema adapter" in schema_insights[0]["title"].lower()


def test_timeout_lethal_generates_retry_recommendation() -> None:
    payload = _base_inputs()
    payload.update(
        {
            "most_lethal_mutations": [
                {
                    "mutation_id": "fault.timeout",
                    "attempts_hit": 10,
                    "failures": 6,
                    "failure_rate_when_hit": 0.6,
                    "top_tools": [{"tool": "payments.refund", "count": 4}],
                    "top_reasons": [{"reason": "timeout", "count": 6}],
                }
            ],
            "top_failure_reasons": [{"reason": "timeout", "count": 6, "pct": 0.6}],
        }
    )

    insights = build_run_insights(**payload)
    retry_insights = [item for item in insights if item["id"].startswith("insight.retry_backoff.")]
    assert len(retry_insights) == 1
    assert "backoff" in retry_insights[0]["title"].lower()


def test_insights_are_sorted_by_confidence_desc() -> None:
    payload = _base_inputs()
    payload.update(
        {
            "failed_attempts": 8,
            "policy_violations_total": 2,
            "policy_requires_approval": 2,
            "failures_by_tool": [{"tool": "jira.create_issue", "count": 4, "pct": 0.5}],
            "top_failure_reasons": [{"reason": "timeout", "count": 4, "pct": 0.5}],
            "most_lethal_mutations": [
                {
                    "mutation_id": "schema.rename_field",
                    "attempts_hit": 7,
                    "failures": 4,
                    "failure_rate_when_hit": 0.5714,
                    "top_tools": [{"tool": "jira.create_issue", "count": 3}],
                    "top_reasons": [{"reason": "timeout", "count": 3}],
                },
                {
                    "mutation_id": "fault.rate_limit",
                    "attempts_hit": 6,
                    "failures": 3,
                    "failure_rate_when_hit": 0.5,
                    "top_tools": [{"tool": "slack.send_message", "count": 2}],
                    "top_reasons": [{"reason": "rate_limited", "count": 2}],
                },
            ],
        }
    )

    insights = build_run_insights(**payload)
    confidences = [item["confidence"] for item in insights]
    assert confidences == sorted(confidences, reverse=True)
