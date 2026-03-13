# Sepurux Go Recorder

`go-recorder` provides the recommended Go integration path for Sepurux:
env-aware client setup, managed trace upload, and optional campaign execution.

## API

- `NewClientFromEnv()`
- `NewClient(ClientOptions)`
- `client.Trace(ctx, taskName, taskInput, options, handler)`
- `client.StartTrace(taskName, taskInput, options)`
- Low-level compatibility: `Recorder.BuildTrace()`

## Quick start

```go
import (
	"context"
	"fmt"
	"os"

	sepuruxrecorder "github.com/sepurux/go-recorder"
)

func main() {
	client, err := sepuruxrecorder.NewClientFromEnv()
	if err != nil {
		panic(err)
	}

	recorder, err := client.Trace(
		context.Background(),
		"issue-triage",
		map[string]any{"issueId": 123},
		sepuruxrecorder.TraceOptions{
			CampaignID:   os.Getenv("SEPURUX_CAMPAIGN_ID"),
			MutationPack: "sepurux.core.reliability",
		},
		func(trace *sepuruxrecorder.ManagedRecorder) error {
			trace.ModelStep("planner", map[string]any{"prompt": "triage issue"}, map[string]any{"plan": "call jira"})
			trace.ToolCall("jira.create_issue", map[string]any{"project": "OPS", "title": "Bug"})
			trace.ToolResult("jira.create_issue", map[string]any{"key": "OPS-123"})
			return nil
		},
	)
	if err != nil {
		panic(err)
	}

	fmt.Println(recorder.TraceID)
	fmt.Println(recorder.RunID)
}
```

Set these environment variables first:
- `SEPURUX_API_BASE_URL` (defaults to `http://localhost:8000`)
- `SEPURUX_API_KEY`
- `SEPURUX_PROJECT_ID`
- `SEPURUX_CAMPAIGN_ID` if you want the trace to enqueue a run automatically

## Release

- Push a tag in the format `clients/go-recorder/v0.3.0`.
- GitHub Actions workflow `go-recorder-release.yml` will run `go test` and create a GitHub release.
- Consumers can use the tagged module directly:
  - `go get github.com/sepurux/go-recorder@v0.3.0`
