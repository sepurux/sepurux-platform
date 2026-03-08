# Sepurux Go Client

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

	sepuruxclient "github.com/sepurux/go-sdk"
)

func main() {
	baseURL := os.Getenv("SEPURUX_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8000"
	}

	cfg := sepuruxclient.NewConfiguration()
	cfg.Servers = sepuruxclient.ServerConfigurations{{URL: baseURL}}
	cfg.AddDefaultHeader("X-API-Key", os.Getenv("SEPURUX_API_KEY"))

	client := sepuruxclient.NewAPIClient(cfg)
	ctx := context.Background()
	projectID := os.Getenv("SEPURUX_PROJECT_ID")
	campaignID := os.Getenv("SEPURUX_CAMPAIGN_ID")

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

	runReq := sepuruxclient.NewRunCreateRequest(trace.GetTraceId(), campaignID)
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
