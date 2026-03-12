from __future__ import annotations

from uuid import uuid4

from replayer import build_attempt_replay_outcome


def test_build_attempt_replay_outcome_infers_target_tool_from_event() -> None:
    run_id = uuid4()
    attempt_id = uuid4()

    outcome = build_attempt_replay_outcome(
        run_id=run_id,
        attempt_id=attempt_id,
        mutation={
            "mutation_id": "timeout-from-event",
            "event": {
                "tool": "jira.create_issue",
                "args": {"title": "Create issue"},
            },
            "force_fail": True,
            "failure_reason": "timeout",
        },
        trace_s3_key=f"traces/{run_id}.json",
        default_mutation_id="baseline",
    )

    assert outcome.result == "failed"
    assert outcome.failure_reason == "timeout"
    assert outcome.first_failure_tool == "jira.create_issue"
    events = outcome.timeline_artifact["events"]
    assert events[2]["tool"] == "jira.create_issue"
    assert events[2]["args"] == {"title": "Create issue"}


def test_build_attempt_replay_outcome_rejects_missing_target_tool() -> None:
    run_id = uuid4()
    attempt_id = uuid4()

    outcome = build_attempt_replay_outcome(
        run_id=run_id,
        attempt_id=attempt_id,
        mutation={
            "mutation_id": "missing-tool",
            "args": {"title": "Create issue"},
        },
        trace_s3_key=f"traces/{run_id}.json",
        default_mutation_id="baseline",
    )

    assert outcome.result == "failed"
    assert outcome.failure_reason == "replay_contract_invalid_tool"
    assert outcome.first_failure_tool == "replay.execute"
    events = outcome.timeline_artifact["events"]
    assert events[3]["error"]["type"] == "ReplayContractError"
    assert events[3]["error"]["code"] == "replay_contract_invalid_tool"


def test_build_attempt_replay_outcome_rejects_invalid_response_contract() -> None:
    run_id = uuid4()
    attempt_id = uuid4()

    outcome = build_attempt_replay_outcome(
        run_id=run_id,
        attempt_id=attempt_id,
        mutation={
            "mutation_id": "bad-result",
            "tool": "jira.create_issue",
            "args": {"title": "Create issue"},
            "tool_result": {"ok": "yes"},
        },
        trace_s3_key=f"traces/{run_id}.json",
        default_mutation_id="baseline",
    )

    assert outcome.result == "failed"
    assert outcome.failure_reason == "replay_contract_invalid_response"
    assert outcome.first_failure_tool == "replay.execute"
    events = outcome.timeline_artifact["events"]
    assert events[3]["error"]["type"] == "ReplayContractError"
    assert events[3]["error"]["code"] == "replay_contract_invalid_response"


def test_build_attempt_replay_outcome_emits_typed_result_contract() -> None:
    run_id = uuid4()
    attempt_id = uuid4()

    outcome = build_attempt_replay_outcome(
        run_id=run_id,
        attempt_id=attempt_id,
        mutation={
            "mutation_id": "typed-result",
            "tool": "jira.create_issue",
            "args": {"title": "Create issue"},
        },
        trace_s3_key=f"traces/{run_id}.json",
        default_mutation_id="baseline",
    )

    assert outcome.result == "passed"
    events = outcome.timeline_artifact["events"]
    result = events[3]["result"]
    assert result["ok"] is True
    assert result["status"] == "replayed"
    assert result["tool"] == "jira.create_issue"
    assert result["mutation_id"] == "typed-result"
    assert result["contract"] == {
        "kind": "replay.execute.result",
        "version": "0.1",
        "validated": True,
    }
