# Crash Lab Go Recorder

`go-recorder` provides a small helper for building Crash Lab trace payloads
(`trace_version = 0.1`) from Go services.

## API

- `NewRecorder(taskName string, taskInput map[string]any)`
- `ToolCall(name string, args map[string]any)`
- `ToolResult(name string, result map[string]any)`
- `ModelStep(name string, input any, output any)`
- `Error(msg string)`
- `Trace()`

## Example (with generated Go client)

```go
import (
	"context"

	crashlabclient "github.com/felixkwasisarpong/crash-lab/clients/go"
	crashlabrecorder "github.com/felixkwasisarpong/crash-lab/clients/go-recorder"
)

recorder := crashlabrecorder.NewRecorder("issue-triage", map[string]any{"issueId": 123})
recorder.ModelStep("planner", map[string]any{"prompt": "triage issue"}, map[string]any{"plan": "call jira"})
recorder.ToolCall("jira.create_issue", map[string]any{"project": "OPS", "title": "Bug"})
recorder.ToolResult("jira.create_issue", map[string]any{"key": "OPS-123"})

cfg := crashlabclient.NewConfiguration()
cfg.Servers = crashlabclient.ServerConfigurations{{URL: "http://localhost:8000"}}
cfg.AddDefaultHeader("X-API-Key", "<api_key>")
client := crashlabclient.NewAPIClient(cfg)

trace, _, _ := client.TracesAPI.PostTraceV1TracesPost(context.Background()).
	Body(recorder.Trace()).
	XProjectId("<project_id>").
	Execute()

runReq := crashlabclient.NewRunCreateRequest(trace.GetTraceId(), "<campaign_id>")
_, _, _ = client.RunsAPI.PostRunV1RunsPost(context.Background()).
	RunCreateRequest(*runReq).
	XProjectId("<project_id>").
	Execute()
```

## Release

- Push a tag in the format `clients/go-recorder/vX.Y.Z`.
- GitHub Actions workflow `go-recorder-release.yml` will run `go test` and create a GitHub release.
- Consumers can use the tagged module directly:
  - `go get github.com/felixkwasisarpong/crash-lab/clients/go-recorder@vX.Y.Z`
