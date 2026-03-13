# Sepurux TypeScript Client

Generated from `clients/openapi.json` with OpenAPI Generator (`typescript-fetch`).

For the easiest tracing flow, use `@sepurux/recorder`. This package is the low-level
generated API client for cases where you need direct endpoint access beyond managed tracing.

## Install

```bash
npm install @sepurux/client
```

## Regenerate

```bash
make gen-clients
```

## Recommended tracing path

```ts
import { SepuruxClient } from "@sepurux/recorder";

const client = SepuruxClient.fromEnv();

const recorder = await client.trace(
  "demo-task",
  { prompt: "hello" },
  async (trace) => {
    trace.modelStep("assistant", { prompt: "hello" }, { text: "hi" });
  },
  { campaignId: process.env.SEPURUX_CAMPAIGN_ID },
);

console.log(recorder.traceId);
console.log(recorder.runId);
```

## Release

- Push a tag in the format `ts-client-v0.3.0`.
- GitHub Actions workflow `ts-client-publish-npm.yml` will validate the package version, build it, and publish to npm.
