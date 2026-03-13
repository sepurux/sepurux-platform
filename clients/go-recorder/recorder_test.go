package sepuruxrecorder

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func TestTraceIncludesVersionAndTask(t *testing.T) {
	recorder := NewRecorder("demo-task", map[string]any{"userId": "u-1"})
	recorder.ModelStep("planner", map[string]any{"prompt": "hello"}, map[string]any{"plan": "call tool"})

	trace := recorder.BuildTrace()

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

func TestClientTraceUploadsAndStartsRun(t *testing.T) {
	var requests []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests = append(requests, r.URL.Path)
		if r.Header.Get("X-API-Key") != "key-1" {
			t.Fatalf("expected X-API-Key header, got %q", r.Header.Get("X-API-Key"))
		}
		if r.Header.Get("X-Project-Id") != "project-1" {
			t.Fatalf("expected X-Project-Id header, got %q", r.Header.Get("X-Project-Id"))
		}

		switch r.URL.Path {
		case "/v1/traces":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"trace_id":"trace-123"}`))
		case "/v1/runs":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"run_id":"run-456"}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client, err := NewClient(ClientOptions{
		BaseURL:    server.URL,
		APIKey:     "key-1",
		ProjectID:  "project-1",
		HTTPClient: server.Client(),
	})
	if err != nil {
		t.Fatalf("unexpected NewClient error: %v", err)
	}

	recorder, err := client.Trace(
		context.Background(),
		"demo-task",
		map[string]any{"userId": "u-1"},
		TraceOptions{CampaignID: "campaign-123"},
		func(trace *ManagedRecorder) error {
			trace.ModelStep("planner", map[string]any{"prompt": "hello"}, map[string]any{"plan": "call jira"})
			return nil
		},
	)
	if err != nil {
		t.Fatalf("unexpected trace error: %v", err)
	}

	if recorder.TraceID != "trace-123" {
		t.Fatalf("expected trace ID trace-123, got %q", recorder.TraceID)
	}
	if recorder.RunID != "run-456" {
		t.Fatalf("expected run ID run-456, got %q", recorder.RunID)
	}
	if len(requests) != 2 || requests[0] != "/v1/traces" || requests[1] != "/v1/runs" {
		t.Fatalf("unexpected request sequence: %#v", requests)
	}
}

func TestClientTraceUsesRunPackWhenRequested(t *testing.T) {
	var requests []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests = append(requests, r.URL.Path)
		switch r.URL.Path {
		case "/v1/traces":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"trace_id":"trace-123"}`))
		case "/v1/campaigns/campaign-123/run-pack":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"run_id":"run-789"}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client, err := NewClient(ClientOptions{
		BaseURL:    server.URL,
		HTTPClient: server.Client(),
	})
	if err != nil {
		t.Fatalf("unexpected NewClient error: %v", err)
	}

	recorder, err := client.Trace(
		context.Background(),
		"demo-task",
		nil,
		TraceOptions{CampaignID: "campaign-123", MutationPack: "core.reliability"},
		func(trace *ManagedRecorder) error {
			trace.ToolCall("jira.create_issue", map[string]any{"title": "Bug"})
			trace.ToolResult("jira.create_issue", map[string]any{"key": "OPS-123"})
			return nil
		},
	)
	if err != nil {
		t.Fatalf("unexpected trace error: %v", err)
	}

	if recorder.RunID != "run-789" {
		t.Fatalf("expected run ID run-789, got %q", recorder.RunID)
	}
	if len(requests) != 2 || requests[1] != "/v1/campaigns/campaign-123/run-pack" {
		t.Fatalf("unexpected request sequence: %#v", requests)
	}
}

func TestNewClientFromEnvReadsStandardEnvironment(t *testing.T) {
	t.Setenv("SEPURUX_API_BASE_URL", "https://example.test")
	t.Setenv("SEPURUX_API_KEY", "env-key")
	t.Setenv("SEPURUX_PROJECT_ID", "env-project")
	_ = os.Unsetenv("SEPURUX_BASE_URL")

	client, err := NewClientFromEnv()
	if err != nil {
		t.Fatalf("unexpected NewClientFromEnv error: %v", err)
	}

	if client.baseURL != "https://example.test" {
		t.Fatalf("expected base URL https://example.test, got %q", client.baseURL)
	}
	if client.apiKey != "env-key" {
		t.Fatalf("expected API key env-key, got %q", client.apiKey)
	}
	if client.projectID != "env-project" {
		t.Fatalf("expected project ID env-project, got %q", client.projectID)
	}
}
