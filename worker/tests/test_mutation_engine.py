from __future__ import annotations

import copy
import random
from typing import Any
from uuid import uuid4

from mutation_engine import _apply_latency_delay, _MutationDefinition, apply_mutation_pack


def _timeline_fixture() -> dict[str, object]:
    return {
        "timeline_version": "0.1",
        "events": [
            {
                "index": 2,
                "type": "tool_call",
                "tool": "jira.create_issue",
                "args": {"title": "Create issue"},
            },
            {
                "index": 3,
                "type": "tool_result",
                "tool": "jira.create_issue",
                "result": {"ok": True, "status": "draft", "text": "hello"},
            },
            {
                "index": 4,
                "type": "model",
                "result": {"summary": "done"},
            },
        ],
    }


def _timeline_with_bootstrap_fixture() -> dict[str, object]:
    return {
        "timeline_version": "0.1",
        "events": [
            {
                "index": 0,
                "type": "tool_call",
                "tool": "trace.load",
                "args": {"s3_key": "traces/demo.json"},
            },
            {
                "index": 1,
                "type": "tool_result",
                "tool": "trace.load",
                "result": {"ok": True},
            },
            {
                "index": 2,
                "type": "tool_call",
                "tool": "jira.create_issue",
                "args": {"title": "Create issue"},
            },
            {
                "index": 3,
                "type": "tool_result",
                "tool": "jira.create_issue",
                "result": {"ok": True, "status": "draft", "text": "hello"},
            },
        ],
    }


def test_apply_mutation_pack_is_deterministic_for_same_seed_and_trace() -> None:
    config = {
        "max_mutations_per_attempt": 2,
        "mutations": [
            {
                "mutation_id": "rename-status",
                "type": "schema.rename_field",
                "target": {"tool": "jira.*"},
                "params": {"from": "status", "to": "state"},
                "probability": 1.0,
                "weight": 1.0,
            },
            {
                "mutation_id": "inject-poison",
                "type": "poison.inject",
                "target": {"tool": "jira.*"},
                "params": {"payload": " ::poison::"},
                "probability": 1.0,
                "weight": 1.0,
            },
        ],
    }
    run_id = uuid4()
    attempt_id = uuid4()
    timeline = _timeline_fixture()

    first = apply_mutation_pack(
        config,
        run_id=run_id,
        attempt_id=attempt_id,
        attempt_index=0,
        timeline_artifact=copy.deepcopy(timeline),
        seed=123456,
    )
    second = apply_mutation_pack(
        config,
        run_id=run_id,
        attempt_id=attempt_id,
        attempt_index=0,
        timeline_artifact=copy.deepcopy(timeline),
        seed=123456,
    )

    assert first.seed == second.seed
    assert first.mutation_trace == second.mutation_trace
    assert first.timeline_artifact == second.timeline_artifact


def test_apply_mutation_pack_seed_is_stable_for_run_id_and_attempt_index() -> None:
    config = {
        "max_mutations_per_attempt": 1,
        "mutations": [
            {
                "mutation_id": "drop-status",
                "type": "schema.drop_field",
                "target": {"tool": "jira.*"},
                "params": {"field": "status"},
                "probability": 1.0,
                "weight": 1.0,
            },
            {
                "mutation_id": "inject-poison",
                "type": "poison.inject",
                "target": {"tool": "jira.*"},
                "params": {"payload": " ::poison::"},
                "probability": 1.0,
                "weight": 1.0,
            },
        ],
    }
    run_id = uuid4()
    timeline = _timeline_fixture()

    first = apply_mutation_pack(
        config,
        run_id=run_id,
        attempt_id=uuid4(),
        attempt_index=2,
        timeline_artifact=copy.deepcopy(timeline),
    )
    second = apply_mutation_pack(
        config,
        run_id=run_id,
        attempt_id=uuid4(),
        attempt_index=2,
        timeline_artifact=copy.deepcopy(timeline),
    )

    assert first.seed == second.seed
    assert first.mutation_trace == second.mutation_trace
    assert first.timeline_artifact == second.timeline_artifact


def test_apply_mutation_pack_uses_seed_to_vary_selection() -> None:
    config = {
        "max_mutations_per_attempt": 1,
        "mutations": [
            {
                "mutation_id": "drop-status",
                "type": "schema.drop_field",
                "target": {"tool": "jira.*"},
                "params": {"field": "status"},
                "probability": 1.0,
                "weight": 1.0,
            },
            {
                "mutation_id": "inject-poison",
                "type": "poison.inject",
                "target": {"tool": "jira.*"},
                "params": {"payload": " ::poison::"},
                "probability": 1.0,
                "weight": 1.0,
            },
            {
                "mutation_id": "timeout-tool-call",
                "type": "fault.timeout",
                "target": {"tool": "jira.*"},
                "probability": 1.0,
                "weight": 1.0,
            },
        ],
    }
    run_id = uuid4()
    attempt_id = uuid4()

    selected_by_seed: set[str] = set()
    for seed in range(10, 20):
        outcome = apply_mutation_pack(
            config,
            run_id=run_id,
            attempt_id=attempt_id,
            attempt_index=0,
            timeline_artifact=copy.deepcopy(_timeline_fixture()),
            seed=seed,
        )
        applied = outcome.mutation_trace["applied"]
        assert isinstance(applied, list)
        if applied:
            selected_by_seed.add(str(applied[0]["mutation_id"]))

    assert len(selected_by_seed) >= 2


def test_apply_mutation_pack_varies_across_attempt_indices() -> None:
    config = {
        "max_mutations_per_attempt": 1,
        "mutations": [
            {
                "mutation_id": "drop-status",
                "type": "schema.drop_field",
                "target": {"tool": "jira.*"},
                "params": {"field": "status"},
                "probability": 1.0,
                "weight": 1.0,
            },
            {
                "mutation_id": "inject-poison",
                "type": "poison.inject",
                "target": {"tool": "jira.*"},
                "params": {"payload": " ::poison::"},
                "probability": 1.0,
                "weight": 1.0,
            },
            {
                "mutation_id": "timeout-tool-call",
                "type": "fault.timeout",
                "target": {"tool": "jira.*"},
                "probability": 1.0,
                "weight": 1.0,
            },
        ],
    }
    run_id = uuid4()
    attempt_id = uuid4()

    selected_by_attempt_index: set[str] = set()
    for attempt_index in range(10):
        outcome = apply_mutation_pack(
            config,
            run_id=run_id,
            attempt_id=attempt_id,
            attempt_index=attempt_index,
            timeline_artifact=copy.deepcopy(_timeline_fixture()),
        )
        applied = outcome.mutation_trace["applied"]
        assert isinstance(applied, list)
        if applied:
            selected_by_attempt_index.add(str(applied[0]["mutation_id"]))

    assert len(selected_by_attempt_index) >= 2


def test_apply_mutation_pack_supports_id_as_type_and_params_prob() -> None:
    config = {
        "max_mutations_per_attempt": 1,
        "mutations": [
            {
                "id": "schema.drop_field",
                "target": {"tool": "jira.*"},
                "params": {"field": "status", "prob": 1.0},
                "weight": 1.0,
            }
        ],
    }
    outcome = apply_mutation_pack(
        config,
        run_id=uuid4(),
        attempt_id=uuid4(),
        attempt_index=0,
        timeline_artifact=copy.deepcopy(_timeline_fixture()),
    )

    applied = outcome.mutation_trace["applied"]
    assert isinstance(applied, list)
    assert len(applied) == 1
    assert applied[0]["mutation_id"] == "schema.drop_field"

    events = outcome.timeline_artifact["events"]
    assert isinstance(events, list)
    tool_results = [event for event in events if event.get("type") == "tool_result"]
    assert tool_results
    result = tool_results[0].get("result")
    assert isinstance(result, dict)
    assert "status" not in result


def test_fault_timeout_forces_failure_and_schema_rename_applies() -> None:
    config = {
        "max_mutations_per_attempt": 2,
        "mutations": [
            {
                "mutation_id": "rename-status",
                "type": "schema.rename_field",
                "target": {"tool": "jira.*"},
                "params": {"from": "status", "to": "state"},
                "probability": 1.0,
                "weight": 1.0,
            },
            {
                "mutation_id": "timeout-tool-call",
                "type": "fault.timeout",
                "target": {"tool": "jira.*"},
                "probability": 1.0,
                "weight": 1.0,
            },
        ],
    }
    run_id = uuid4()
    attempt_id = uuid4()

    outcome = apply_mutation_pack(
        config,
        run_id=run_id,
        attempt_id=attempt_id,
        attempt_index=3,
        timeline_artifact=copy.deepcopy(_timeline_fixture()),
        seed=33,
    )

    assert outcome.forced_failure_reason == "timeout"
    assert outcome.first_failure_tool == "jira.create_issue"
    assert outcome.first_failure_event_index == 3

    events = outcome.timeline_artifact["events"]
    assert isinstance(events, list)
    assert events[-1]["type"] == "error"
    assert events[-1]["tool"] == "jira.create_issue"

    applied = outcome.mutation_trace["applied"]
    assert isinstance(applied, list)
    applied_ids = [str(item["mutation_id"]) for item in applied]
    assert applied_ids == ["rename-status", "timeout-tool-call"]


def test_fault_timeout_skips_internal_trace_load_events() -> None:
    config = {
        "max_mutations_per_attempt": 1,
        "mutations": [
            {
                "mutation_id": "timeout-tool-call",
                "type": "fault.timeout",
                "probability": 1.0,
                "weight": 1.0,
            }
        ],
    }

    outcome = apply_mutation_pack(
        config,
        run_id=uuid4(),
        attempt_id=uuid4(),
        attempt_index=0,
        timeline_artifact=copy.deepcopy(_timeline_with_bootstrap_fixture()),
        seed=9,
    )

    assert outcome.forced_failure_reason == "timeout"
    assert outcome.first_failure_tool == "jira.create_issue"
    assert outcome.first_failure_event_index == 3

    events = outcome.timeline_artifact["events"]
    assert isinstance(events, list)
    assert [event["tool"] for event in events if event.get("type") == "tool_call"] == [
        "trace.load",
        "jira.create_issue",
    ]
    assert events[-1]["type"] == "error"
    assert events[-1]["tool"] == "jira.create_issue"


def test_fault_auth_failure_injects_auth_error_event() -> None:
    config = {
        "max_mutations_per_attempt": 1,
        "mutations": [
            {
                "mutation_id": "auth-fail",
                "type": "fault.auth_failure",
                "target": {"tool": "jira.*"},
                "probability": 1.0,
                "weight": 1.0,
            }
        ],
    }
    outcome = apply_mutation_pack(
        config,
        run_id=uuid4(),
        attempt_id=uuid4(),
        attempt_index=0,
        timeline_artifact=copy.deepcopy(_timeline_fixture()),
        seed=1,
    )

    events = outcome.timeline_artifact["events"]
    error_events = [e for e in events if e.get("type") == "error"]
    assert len(error_events) == 1
    err = error_events[0]["error"]
    assert err["type"] == "AuthError"


def test_fault_auth_failure_sets_forced_failure_reason() -> None:
    config = {
        "max_mutations_per_attempt": 1,
        "mutations": [
            {
                "mutation_id": "auth-fail",
                "type": "fault.auth_failure",
                "target": {"tool": "jira.*"},
                "probability": 1.0,
                "weight": 1.0,
            }
        ],
    }
    outcome = apply_mutation_pack(
        config,
        run_id=uuid4(),
        attempt_id=uuid4(),
        attempt_index=0,
        timeline_artifact=copy.deepcopy(_timeline_fixture()),
        seed=1,
    )

    assert outcome.forced_failure_reason == "auth_failed"
    assert outcome.first_failure_tool == "jira.create_issue"


def test_fault_auth_failure_custom_error_message() -> None:
    config = {
        "max_mutations_per_attempt": 1,
        "mutations": [
            {
                "mutation_id": "auth-fail",
                "type": "fault.auth_failure",
                "target": {"tool": "jira.*"},
                "params": {"error_message": "401 Unauthorized: token expired"},
                "probability": 1.0,
                "weight": 1.0,
            }
        ],
    }
    outcome = apply_mutation_pack(
        config,
        run_id=uuid4(),
        attempt_id=uuid4(),
        attempt_index=0,
        timeline_artifact=copy.deepcopy(_timeline_fixture()),
        seed=1,
    )

    events = outcome.timeline_artifact["events"]
    error_events = [e for e in events if e.get("type") == "error"]
    assert error_events[0]["error"]["message"] == "401 Unauthorized: token expired"


def test_fault_auth_failure_does_not_target_bootstrap_tools() -> None:
    config = {
        "max_mutations_per_attempt": 1,
        "mutations": [
            {
                "mutation_id": "auth-fail",
                "type": "fault.auth_failure",
                "target": {"tool": "*"},
                "probability": 1.0,
                "weight": 1.0,
            }
        ],
    }
    outcome = apply_mutation_pack(
        config,
        run_id=uuid4(),
        attempt_id=uuid4(),
        attempt_index=0,
        timeline_artifact=copy.deepcopy(_timeline_with_bootstrap_fixture()),
        seed=1,
    )

    events = outcome.timeline_artifact["events"]
    error_events = [e for e in events if e.get("type") == "error"]
    # Must not inject an error on trace.load — only on jira.create_issue
    assert all(e.get("tool") != "trace.load" for e in error_events)
    assert outcome.forced_failure_reason == "auth_failed"


def test_latency_delay_samples_within_range_not_always_max() -> None:
    """latency_delay must sample randomly between min_ms and max_ms, not always use max."""
    definition = _MutationDefinition(
        mutation_id="latency-test",
        mutation_type="latency_delay",
        target_tool_pattern="jira.*",
        probability=1.0,
        weight=1.0,
        params={"min_ms": 100, "max_ms": 500},
    )
    timeline = _timeline_fixture()

    seen: set[int] = set()
    raw_events = timeline["events"]
    assert isinstance(raw_events, list)
    for seed in range(50):
        random.seed(seed)
        events: list[dict[str, Any]] = copy.deepcopy(raw_events)
        result = _apply_latency_delay(definition, events)
        assert result is not None
        delay = result["details"]["latency_ms"]
        assert 100 <= delay <= 500, f"delay {delay} out of range"
        seen.add(delay)

    assert len(seen) > 1, "latency_delay always returned the same value — still using max"
