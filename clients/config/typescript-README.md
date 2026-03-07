# Crash Lab TypeScript Client

Generated from `clients/openapi.json` with OpenAPI Generator (`typescript-fetch`).

## Regenerate

```bash
make gen-clients
```

## Install

```bash
cd clients/typescript
npm install
npm run build
```

## Quick Start

```ts
import { Configuration, RunsApi, TracesApi } from "crashlab-client";

const config = new Configuration({
  basePath: process.env.CRASHLAB_BASE_URL ?? "http://localhost:8000",
  headers: {
    "X-API-Key": process.env.CRASHLAB_API_KEY ?? "",
    "X-Project-Id": process.env.CRASHLAB_PROJECT_ID ?? "",
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
    campaign_id: process.env.CRASHLAB_CAMPAIGN_ID ?? "",
  },
});

const latest = await runsApi.getRunV1RunsRunIdGet({ runId: run.run_id });
console.log(latest.status);
```
