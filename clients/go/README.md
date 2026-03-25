# Sepurux Go Client

Generated from `clients/openapi.json` with OpenAPI Generator (`go`).

For the easiest tracing flow, use `github.com/sepurux/go-recorder`. This package is the
low-level generated API client for cases where you need direct endpoint access beyond managed tracing.

## Install

```bash
go get github.com/sepurux/sepurux-platform/clients/go@v0.5.0
```

## Regenerate

```bash
make gen-clients
```

## Recommended tracing path

```go
package main

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
		"demo-task",
		map[string]any{"prompt": "hello"},
		sepuruxrecorder.TraceOptions{CampaignID: os.Getenv("SEPURUX_CAMPAIGN_ID")},
		func(trace *sepuruxrecorder.ManagedRecorder) error {
			trace.ModelStep("assistant", map[string]any{"prompt": "hello"}, map[string]any{"text": "hi"})
			return nil
		},
	)
	if err != nil {
		panic(err)
	}

	fmt.Println("trace id:", recorder.TraceID)
	fmt.Println("run id:", recorder.RunID)
}
```

## Release

- Push a tag in the format `clients/go/v0.5.0`.
- GitHub Actions workflow `go-client-release.yml` will run `go test` and create a GitHub release for the tagged module.
