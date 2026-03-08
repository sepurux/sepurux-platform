package sepuruxrecorder

import "testing"

func TestTraceIncludesVersionAndTask(t *testing.T) {
	recorder := NewRecorder("demo-task", map[string]any{"userId": "u-1"})
	recorder.ModelStep("planner", map[string]any{"prompt": "hello"}, map[string]any{"plan": "call tool"})

	trace := recorder.Trace()

	if trace.TraceVersion != "0.1" {
		t.Fatalf("expected trace_version=0.1, got %q", trace.TraceVersion)
	}
	if trace.Task.Name != "demo-task" {
		t.Fatalf("expected task name demo-task, got %q", trace.Task.Name)
	}
	if len(trace.Events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(trace.Events))
	}
	if trace.Events[0].Type != "model_step" {
		t.Fatalf("expected model_step event, got %q", trace.Events[0].Type)
	}
}

func TestToolCallAndResultOrdering(t *testing.T) {
	recorder := NewRecorder("demo-task", nil)
	recorder.ToolCall("jira.create_issue", map[string]any{"title": "Bug"})
	recorder.ToolResult("jira.create_issue", map[string]any{"key": "OPS-123"})

	trace := recorder.Trace()
	if len(trace.Events) != 2 {
		t.Fatalf("expected 2 events, got %d", len(trace.Events))
	}
	if trace.Events[0].Index != 0 || trace.Events[1].Index != 1 {
		t.Fatalf("expected event indexes [0,1], got [%d,%d]", trace.Events[0].Index, trace.Events[1].Index)
	}
	if trace.Events[0].Type != "tool_call" || trace.Events[1].Type != "tool_result" {
		t.Fatalf("unexpected event types [%q,%q]", trace.Events[0].Type, trace.Events[1].Type)
	}
	if trace.Events[0].Tool != "jira.create_issue" || trace.Events[1].Tool != "jira.create_issue" {
		t.Fatalf("unexpected tools [%q,%q]", trace.Events[0].Tool, trace.Events[1].Tool)
	}
	if trace.Events[0].Timestamp.IsZero() || trace.Events[1].Timestamp.IsZero() {
		t.Fatal("expected non-zero timestamps")
	}
}
