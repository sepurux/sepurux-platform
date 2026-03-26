"""Unit tests for _evaluate_attempt_checks — the three new checks plus legacy behaviour."""
from __future__ import annotations

from worker import _evaluate_attempt_checks


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _timeline(events: list[dict]) -> dict:
    return {"timeline_version": "0.1", "events": events}


def _tool_call(tool: str, index: int = 0) -> dict:
    return {"index": index, "type": "tool_call", "tool": tool, "args": {}}


def _tool_result(tool: str, result: dict, index: int = 1) -> dict:
    return {"index": index, "type": "tool_result", "tool": tool, "result": result}


def _error_event(tool: str, message: str, index: int = 2) -> dict:
    return {"index": index, "type": "error", "tool": tool, "error": {"message": message}}


# ---------------------------------------------------------------------------
# no_unexpected_failures
# ---------------------------------------------------------------------------


def test_no_unexpected_failures_passes_on_clean_timeline() -> None:
    timeline = _timeline([
        _tool_call("payments.refund", 0),
        _tool_result("payments.refund", {"status": "ok"}, 1),
    ])
    assert _evaluate_attempt_checks(checks=["no_unexpected_failures"], timeline_artifact=timeline) is None


def test_no_unexpected_failures_fails_when_error_event_present() -> None:
    timeline = _timeline([
        _tool_call("payments.refund", 0),
        _error_event("payments.refund", "connection refused", 1),
    ])
    result = _evaluate_attempt_checks(checks=["no_unexpected_failures"], timeline_artifact=timeline)
    assert result is not None
    code, msg = result
    assert code == "unexpected_failure"
    assert "payments.refund" in msg
    assert "connection refused" in msg


def test_no_unexpected_failures_passes_on_empty_timeline() -> None:
    timeline = _timeline([])
    assert _evaluate_attempt_checks(checks=["no_unexpected_failures"], timeline_artifact=timeline) is None


def test_no_unexpected_failures_does_not_need_tool_result_event() -> None:
    """Should pass without any tool_result event in the timeline."""
    timeline = _timeline([_tool_call("db.query", 0)])
    assert _evaluate_attempt_checks(checks=["no_unexpected_failures"], timeline_artifact=timeline) is None


# ---------------------------------------------------------------------------
# output_contains:<field>
# ---------------------------------------------------------------------------


def test_output_contains_passes_when_field_present() -> None:
    timeline = _timeline([
        _tool_call("payments.refund", 0),
        _tool_result("payments.refund", {"refund_id": "rf_1", "status": "queued"}, 1),
    ])
    assert _evaluate_attempt_checks(
        checks=["output_contains:refund_id"], timeline_artifact=timeline
    ) is None


def test_output_contains_fails_when_field_missing() -> None:
    timeline = _timeline([
        _tool_call("payments.refund", 0),
        _tool_result("payments.refund", {"status": "queued"}, 1),
    ])
    result = _evaluate_attempt_checks(
        checks=["output_contains:refund_id"], timeline_artifact=timeline
    )
    assert result is not None
    code, msg = result
    assert code == "missing_field"
    assert "refund_id" in msg


def test_output_contains_skips_malformed_check_without_field_name() -> None:
    """output_contains: with empty field name should be silently skipped."""
    timeline = _timeline([
        _tool_result("payments.refund", {"status": "ok"}, 1),
    ])
    assert _evaluate_attempt_checks(
        checks=["output_contains:"], timeline_artifact=timeline
    ) is None


def test_output_contains_fails_gracefully_when_no_tool_result_event() -> None:
    timeline = _timeline([_tool_call("db.query", 0)])
    result = _evaluate_attempt_checks(
        checks=["output_contains:refund_id"], timeline_artifact=timeline
    )
    assert result is not None
    assert result[0] == "replay_contract_invalid_response"


# ---------------------------------------------------------------------------
# tool_was_called:<tool>
# ---------------------------------------------------------------------------


def test_tool_was_called_passes_when_tool_present() -> None:
    timeline = _timeline([
        _tool_call("payments.refund", 0),
        _tool_result("payments.refund", {"status": "ok"}, 1),
    ])
    assert _evaluate_attempt_checks(
        checks=["tool_was_called:payments.refund"], timeline_artifact=timeline
    ) is None


def test_tool_was_called_fails_when_tool_absent() -> None:
    timeline = _timeline([
        _tool_call("db.query", 0),
        _tool_result("db.query", {"rows": []}, 1),
    ])
    result = _evaluate_attempt_checks(
        checks=["tool_was_called:payments.refund"], timeline_artifact=timeline
    )
    assert result is not None
    code, msg = result
    assert code == "missing_tool_call"
    assert "payments.refund" in msg


def test_tool_was_called_skips_malformed_check_without_tool_name() -> None:
    timeline = _timeline([_tool_call("db.query", 0)])
    assert _evaluate_attempt_checks(
        checks=["tool_was_called:"], timeline_artifact=timeline
    ) is None


def test_tool_was_called_does_not_match_tool_results() -> None:
    """tool_result events should not count as the tool being 'called'."""
    timeline = _timeline([
        _tool_result("payments.refund", {"status": "ok"}, 0),
    ])
    result = _evaluate_attempt_checks(
        checks=["tool_was_called:payments.refund"], timeline_artifact=timeline
    )
    assert result is not None
    assert result[0] == "missing_tool_call"


# ---------------------------------------------------------------------------
# Mixed checks — ordering and short-circuit behaviour
# ---------------------------------------------------------------------------


def test_checks_run_in_order_and_first_failure_wins() -> None:
    """When two checks fail, the first one in the list is reported."""
    timeline = _timeline([
        _tool_call("db.query", 0),
        _error_event("db.query", "timeout", 1),
        _tool_result("db.query", {"rows": []}, 2),
    ])
    result = _evaluate_attempt_checks(
        checks=["no_unexpected_failures", "tool_was_called:payments.refund"],
        timeline_artifact=timeline,
    )
    assert result is not None
    assert result[0] == "unexpected_failure"


def test_new_checks_combined_with_legacy_status_check() -> None:
    """no_unexpected_failures + status can both pass on a valid timeline."""
    timeline = _timeline([
        _tool_call("replay.execute", 0),
        _tool_result("replay.execute", {"status": "replayed", "ok": True}, 1),
    ])
    assert _evaluate_attempt_checks(
        checks=["no_unexpected_failures", "status"],
        timeline_artifact=timeline,
    ) is None


# ---------------------------------------------------------------------------
# Legacy checks — regression guard
# ---------------------------------------------------------------------------


def test_legacy_status_check_still_passes() -> None:
    timeline = _timeline([
        _tool_result("replay.execute", {"status": "replayed"}, 1),
    ])
    assert _evaluate_attempt_checks(checks=["status"], timeline_artifact=timeline) is None


def test_legacy_ok_check_still_passes() -> None:
    timeline = _timeline([
        _tool_result("replay.execute", {"ok": True}, 1),
    ])
    assert _evaluate_attempt_checks(checks=["ok"], timeline_artifact=timeline) is None


def test_legacy_status_check_fails_on_wrong_value() -> None:
    timeline = _timeline([
        _tool_result("replay.execute", {"status": "error"}, 1),
    ])
    result = _evaluate_attempt_checks(checks=["status"], timeline_artifact=timeline)
    assert result is not None
    assert result[0] == "schema_mismatch"
