from __future__ import annotations

from uuid import uuid4

from counterfactuals import run_counterfactual_replays
from models import ReplayAttempt


def test_policy_gate_strategy_blocks_irreversible_call_without_confirmation_token() -> None:
    run_id = uuid4()
    attempt_id = uuid4()
    attempt = ReplayAttempt(
        attempt_id=attempt_id,
        run_id=run_id,
        mutation_id="m-jira-timeout",
        result="failed",
        failure_reason="timeout",
        first_failure_event_index=3,
        first_failure_tool="jira.create_issue",
        artifacts_s3_key=None,
    )
    mutation = {
        "mutation_id": "m-jira-timeout",
        "tool": "jira.create_issue",
        "args": {"summary": "Create issue without explicit confirmation"},
        "force_fail": True,
        "failure_reason": "timeout",
    }

    results = run_counterfactual_replays(
        run_id=run_id,
        attempt=attempt,
        mutation=mutation,
        trace_s3_key=f"traces/{run_id}.json",
    )

    by_strategy = {result.strategy: result for result in results}
    policy_gate = by_strategy["policy_gate_v1"]

    assert policy_gate.result == "fail"
    assert policy_gate.failure_reason == "policy_blocked"
    assert policy_gate.metrics["retries"] == 0
    assert policy_gate.diff["kind"] == "policy_gate"
