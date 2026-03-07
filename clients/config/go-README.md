# Crash Lab Go Client

Generated from `clients/openapi.json` with OpenAPI Generator (`go`).

## Regenerate

```bash
make gen-clients
```

## Quick Start

```go
package main

import (
	"context"
	"fmt"
	"os"

	crashlabclient "github.com/felixkwasisarpong/crash-lab/clients/go"
)

func main() {
	baseURL := os.Getenv("CRASHLAB_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8000"
	}

	cfg := crashlabclient.NewConfiguration()
	cfg.Servers = crashlabclient.ServerConfigurations{{URL: baseURL}}
	cfg.AddDefaultHeader("X-API-Key", os.Getenv("CRASHLAB_API_KEY"))

	client := crashlabclient.NewAPIClient(cfg)
	ctx := context.Background()
	projectID := os.Getenv("CRASHLAB_PROJECT_ID")
	campaignID := os.Getenv("CRASHLAB_CAMPAIGN_ID")

	traceBody := map[string]interface{}{
		"trace_version": "0.1",
		"source":        "sdk",
		"task":          map[string]interface{}{"name": "demo-task", "input": map[string]interface{}{"prompt": "hello"}},
		"events":        []map[string]interface{}{{"type": "model_step", "name": "assistant"}},
	}

	trace, _, err := client.TracesAPI.PostTraceV1TracesPost(ctx).Body(traceBody).XProjectId(projectID).Execute()
	if err != nil {
		panic(err)
	}

	runReq := crashlabclient.NewRunCreateRequest(trace.GetTraceId(), campaignID)
	run, _, err := client.RunsAPI.PostRunV1RunsPost(ctx).RunCreateRequest(*runReq).XProjectId(projectID).Execute()
	if err != nil {
		panic(err)
	}

	latest, _, err := client.RunsAPI.GetRunV1RunsRunIdGet(ctx, run.GetRunId()).XProjectId(projectID).Execute()
	if err != nil {
		panic(err)
	}

	fmt.Println("run status:", latest.GetStatus())
}
```
