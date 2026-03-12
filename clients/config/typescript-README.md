# Sepurux TypeScript Client

Generated from `clients/openapi.json` with OpenAPI Generator (`typescript-fetch`).

## Install

```bash
npm install @sepurux/client
```

## Regenerate

```bash
make gen-clients
```

## Quick Start

```ts
import { Configuration, RunsApi, TracesApi } from "@sepurux/client";

const config = new Configuration({
  basePath: process.env.SEPURUX_BASE_URL ?? "http://localhost:8000",
  headers: {
    "X-API-Key": process.env.SEPURUX_API_KEY ?? "",
    "X-Project-Id": process.env.SEPURUX_PROJECT_ID ?? "",
  },
});

const tracesApi = new TracesApi(config);
const trace = await tracesApi.postTraceV1TracesPost({
  body: {
    trace_version: "0.1",
    source: "sdk",
    task: { name: "demo-task", input: { prompt: "hello" } },
    events: [{ type: "model_step", name: "assistant", output: { text: "hi" } }],
  },
});

const runsApi = new RunsApi(config);
const run = await runsApi.postRunV1RunsPost({
  runCreateRequest: {
    trace_id: trace.trace_id,
    campaign_id: process.env.SEPURUX_CAMPAIGN_ID ?? "",
  },
});

const latest = await runsApi.getRunV1RunsRunIdGet({ runId: run.run_id });
console.log(latest.status);
```

## Release

- Push a tag in the format `ts-client-v0.3.0`.
- GitHub Actions workflow `ts-client-publish-npm.yml` will validate the package version, build it, and publish to npm.
