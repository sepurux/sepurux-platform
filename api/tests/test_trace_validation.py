from __future__ import annotations

from app.services.trace_validation import validate_and_normalize_trace


def test_normalization_maps_legacy_fields_and_adds_missing_event_fields() -> None:
    payload = {
        "trace_version": "0.2",
        "source": "ts-sdk",
        "task": {
            "name": "sync_issues",
        },
        "events": [
            {
                "t": "tool_call",
                "name": "jira.create_issue",
                "input": {"title": "Crash reproducer"},
            },
            {
                "t": "tool_result",
                "name": "jira.create_issue",
                "output": {"ok": True},
                "index": 9,
            },
            {
                "type": "model",
                "result": {"text": "done"},
            },
        ],
    }

    normalized, issues = validate_and_normalize_trace(payload)

    assert issues == []
    assert isinstance(normalized, dict)
    assert normalized["trace_version"] == "0.2"
    assert normalized["task"]["input"] == {}

    events = normalized["events"]
    assert events[0]["type"] == "tool_call"
    assert events[0]["tool"] == "jira.create_issue"
    assert events[0]["args"] == {"title": "Crash reproducer"}
    assert events[0]["index"] == 0
    assert isinstance(events[0]["timestamp"], str)

    assert events[1]["type"] == "tool_result"
    assert events[1]["tool"] == "jira.create_issue"
    assert events[1]["result"] == {"ok": True}
    assert events[1]["index"] == 9
    assert isinstance(events[1]["timestamp"], str)

    assert events[2]["type"] == "model"
    assert events[2]["index"] == 2
    assert isinstance(events[2]["timestamp"], str)
