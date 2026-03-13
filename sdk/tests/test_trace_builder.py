from __future__ import annotations

import pytest
from sepurux import TraceBuilder, sepurux_trace


def test_trace_builder_schema_shape() -> None:
    builder = TraceBuilder("demo_task", {"prompt": "hello"})
    builder.add_model_step("plan", {"goal": "create issue"}, output={"ok": True})
    builder.add_tool_call("jira.create_issue(commit)", {"summary": "test"})
    builder.add_tool_result("jira.create_issue(commit)", {"issue_id": "OPS-123"})

    trace = builder.to_trace()

    assert trace["trace_version"] == "0.1"
    assert trace["source"] == "sdk"
    assert trace["task"] == {"name": "demo_task", "input": {"prompt": "hello"}}
    assert len(trace["events"]) == 3
    assert trace["events"][0]["type"] == "model_step"
    assert trace["events"][1]["type"] == "tool_call"
    assert trace["events"][2]["type"] == "tool_result"


def test_trace_context_supports_custom_source() -> None:
    with pytest.warns(DeprecationWarning, match="SepuruxClient.trace"):
        with sepurux_trace(
            "demo_task",
            {"prompt": "hello"},
            source="langsmith-like",
            trace_version="0.2",
        ) as rec:
            rec.model_step("plan", {"goal": "create issue"})

    trace = rec.to_trace()

    assert trace["source"] == "langsmith-like"
    assert trace["trace_version"] == "0.2"
