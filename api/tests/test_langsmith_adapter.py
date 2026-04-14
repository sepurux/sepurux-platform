"""Tests for the LangSmith → Sepurux trace format adapter."""
from __future__ import annotations

import pytest

from app.services.langsmith_adapter import adapt_langsmith_trace, is_langsmith_trace
from app.services.trace_validation import validate_and_normalize_trace


# ── helpers ───────────────────────────────────────────────────────────────────

def _minimal_langsmith(run_type: str = "chain", name: str = "agent") -> dict:
    return {
        "id": "abc12345-0000-0000-0000-000000000000",
        "name": name,
        "run_type": run_type,
        "inputs": {"query": "test"},
        "outputs": {"result": "ok"},
        "error": None,
        "child_runs": [],
        "execution_order": 1,
    }


# ── is_langsmith_trace ────────────────────────────────────────────────────────

class TestIsLangsmithTrace:
    def test_detects_run_type(self):
        assert is_langsmith_trace({"run_type": "chain", "inputs": {}})

    def test_detects_child_runs(self):
        assert is_langsmith_trace({"child_runs": [], "name": "x"})

    def test_rejects_sepurux_format(self):
        assert not is_langsmith_trace(
            {"trace_version": "0.2", "source": "sdk", "task": {}, "events": []}
        )

    def test_rejects_when_both_run_type_and_trace_version(self):
        # Already adapted — should not re-adapt
        assert not is_langsmith_trace(
            {"run_type": "chain", "trace_version": "0.2", "events": []}
        )

    def test_rejects_non_dict(self):
        assert not is_langsmith_trace([1, 2, 3])
        assert not is_langsmith_trace("string")
        assert not is_langsmith_trace(None)


# ── adapt_langsmith_trace ────────────────────────────────────────────────────

class TestAdaptLangsmithTrace:
    def test_root_fields(self):
        ls = _minimal_langsmith(name="billing-agent")
        result = adapt_langsmith_trace(ls)
        assert result["trace_version"] == "0.2"
        assert result["source"] == "langsmith"
        assert result["task"]["name"] == "billing-agent"
        assert result["task"]["input"] == {"query": "test"}
        assert result["langsmith_run_id"] == ls["id"]

    def test_single_run_no_children_becomes_event(self):
        ls = _minimal_langsmith(run_type="llm", name="gpt-4")
        result = adapt_langsmith_trace(ls)
        events = result["events"]
        assert len(events) == 1
        assert events[0]["type"] == "llm_call"
        assert events[0]["name"] == "gpt-4"

    def test_chain_run_becomes_llm_call(self):
        ls = _minimal_langsmith(run_type="chain", name="refund-chain")
        result = adapt_langsmith_trace(ls)
        assert result["events"][0]["type"] == "llm_call"

    def test_tool_run_emits_call_and_result_pair(self):
        ls = {
            "name": "lookup_account",
            "run_type": "tool",
            "inputs": {"account_id": "123"},
            "outputs": {"balance": 500},
            "child_runs": [],
        }
        result = adapt_langsmith_trace(ls)
        events = result["events"]
        assert len(events) == 2
        assert events[0]["type"] == "tool_call"
        assert events[0]["tool"] == "lookup_account"
        assert events[0]["args"] == {"account_id": "123"}
        assert events[1]["type"] == "tool_result"
        assert events[1]["tool"] == "lookup_account"
        assert events[1]["result"] == {"balance": 500}

    def test_children_flattened_in_execution_order(self):
        ls = {
            "name": "billing-agent",
            "run_type": "chain",
            "inputs": {"q": "refund"},
            "outputs": {},
            "child_runs": [
                {
                    "name": "second",
                    "run_type": "llm",
                    "execution_order": 2,
                    "inputs": {},
                    "outputs": {},
                    "child_runs": [],
                },
                {
                    "name": "first",
                    "run_type": "llm",
                    "execution_order": 1,
                    "inputs": {},
                    "outputs": {},
                    "child_runs": [],
                },
            ],
        }
        result = adapt_langsmith_trace(ls)
        names = [e["name"] for e in result["events"]]
        assert names == ["first", "second"]

    def test_error_run_adds_error_event(self):
        ls = {
            "name": "bad-tool",
            "run_type": "tool",
            "inputs": {},
            "outputs": {},
            "error": "TimeoutError: upstream took too long",
            "child_runs": [],
        }
        result = adapt_langsmith_trace(ls)
        types = [e["type"] for e in result["events"]]
        assert "error" in types
        error_event = next(e for e in result["events"] if e["type"] == "error")
        assert "TimeoutError" in error_event["error"]["message"]

    def test_nested_tool_inside_chain(self):
        ls = {
            "name": "billing-agent",
            "run_type": "chain",
            "inputs": {"q": "refund me"},
            "outputs": {"answer": "done"},
            "child_runs": [
                {
                    "name": "get_balance",
                    "run_type": "tool",
                    "execution_order": 1,
                    "inputs": {"id": "u1"},
                    "outputs": {"balance": 200},
                    "child_runs": [],
                }
            ],
        }
        result = adapt_langsmith_trace(ls)
        types = [e["type"] for e in result["events"]]
        assert types == ["tool_call", "tool_result"]

    def test_retriever_maps_to_tool_pair(self):
        ls = {
            "name": "vector-search",
            "run_type": "retriever",
            "inputs": {"query": "policy"},
            "outputs": {"documents": []},
            "child_runs": [],
        }
        result = adapt_langsmith_trace(ls)
        types = [e["type"] for e in result["events"]]
        assert types == ["tool_call", "tool_result"]

    def test_prompt_run_maps_to_prompt(self):
        ls = {
            "name": "system-prompt",
            "run_type": "prompt",
            "inputs": {"template": "you are..."},
            "outputs": {},
            "child_runs": [],
        }
        result = adapt_langsmith_trace(ls)
        assert result["events"][0]["type"] == "prompt"


# ── round-trip through validation ────────────────────────────────────────────

class TestLangsmithRoundTrip:
    def test_llm_trace_passes_validation(self):
        ls = _minimal_langsmith(run_type="llm", name="gpt-4")
        adapted = adapt_langsmith_trace(ls)
        normalized, issues = validate_and_normalize_trace(adapted)
        assert issues == [], issues
        assert normalized is not None

    def test_tool_trace_passes_validation(self):
        ls = {
            "name": "refund-agent",
            "run_type": "chain",
            "inputs": {"order_id": "o1"},
            "outputs": {"status": "refunded"},
            "child_runs": [
                {
                    "name": "process_refund",
                    "run_type": "tool",
                    "execution_order": 1,
                    "inputs": {"amount": 50},
                    "outputs": {"success": True},
                    "child_runs": [],
                }
            ],
        }
        adapted = adapt_langsmith_trace(ls)
        normalized, issues = validate_and_normalize_trace(adapted)
        assert issues == [], issues
        assert normalized is not None
        types = [e["type"] for e in normalized["events"]]
        assert "tool_call" in types
        assert "tool_result" in types

    def test_mixed_trace_with_error_passes_validation(self):
        ls = {
            "name": "billing-agent",
            "run_type": "chain",
            "inputs": {"q": "refund"},
            "outputs": {},
            "child_runs": [
                {
                    "name": "gpt-4",
                    "run_type": "llm",
                    "execution_order": 1,
                    "inputs": {"messages": []},
                    "outputs": {"text": "ok"},
                    "child_runs": [],
                },
                {
                    "name": "charge_card",
                    "run_type": "tool",
                    "execution_order": 2,
                    "inputs": {"amount": 100},
                    "outputs": {},
                    "error": "HTTP 429 rate limited",
                    "child_runs": [],
                },
            ],
        }
        adapted = adapt_langsmith_trace(ls)
        normalized, issues = validate_and_normalize_trace(adapted)
        assert issues == [], issues
        assert normalized is not None
        types = [e["type"] for e in normalized["events"]]
        assert "llm_call" in types
        assert "tool_call" in types
        assert "tool_result" in types
        assert "error" in types
