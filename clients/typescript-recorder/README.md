# Sepurux TypeScript Recorder

[![npm](https://img.shields.io/npm/v/@sepurux/recorder)](https://www.npmjs.com/package/@sepurux/recorder)
[![CI](https://github.com/sepurux/sepurux-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/sepurux/sepurux-platform/actions/workflows/ci.yml)

`@sepurux/recorder` provides the recommended TypeScript integration path for Sepurux:
env-aware client setup, managed trace upload, and optional campaign execution.

## API

- `SepuruxClient.fromEnv()`
- `client.trace(taskName, taskInput, handler, options?)` — callback pattern (recommended)
- `client.startTrace(taskName, taskInput, options?)` — imperative pattern
- `recorder.flush()` — upload trace and optionally start a run
- `configure(...)`
- `trace(taskName, taskInput, handler, options?)` — global callback helper
- `startTrace(taskName, taskInput, options?)` — global imperative helper
- Low-level compatibility: `TraceRecorder.buildTrace()`

## Quick start

### Callback pattern (recommended)

Wraps your agent logic in a handler. The trace is uploaded and the run is started automatically when the handler resolves or throws.

```ts
import { SepuruxClient } from "@sepurux/recorder";

const client = SepuruxClient.fromEnv();

const recorder = await client.trace(
  "issue-triage",
  { issueId: 123 },
  async (trace) => {
    trace.modelStep("planner", { prompt: "triage issue" }, { plan: "call jira" });
    trace.toolCall("jira.create_issue", { project: "OPS", title: "Bug" });
    trace.toolResult("jira.create_issue", { key: "OPS-123" });
  },
  {
    campaignId: process.env.SEPURUX_CAMPAIGN_ID,
    mutationPack: "sepurux.core.reliability",
  },
);

console.log(recorder.traceId);
console.log(recorder.runId);
```

### Imperative pattern (`startTrace` / `flush`)

Better for middleware, streaming handlers, or any case where you can't wrap your logic in a single callback. Call `recorder.flush()` when the workflow is complete.

```ts
import { SepuruxClient } from "@sepurux/recorder";

const client = SepuruxClient.fromEnv();

// Create the recorder — no network call yet
const recorder = client.startTrace(
  "issue-triage",
  { issueId: 123 },
  {
    campaignId: process.env.SEPURUX_CAMPAIGN_ID,
    mutationPack: "sepurux.core.reliability",
  },
);

// Instrument your workflow
recorder.modelStep("planner", { prompt: "triage issue" }, { plan: "call jira" });
recorder.toolCall("jira.create_issue", { project: "OPS", title: "Bug" });
recorder.toolResult("jira.create_issue", { key: "OPS-123" });

// Upload trace and start run
const { traceId, runId } = await recorder.flush();

console.log(traceId);
console.log(runId);
```

### Global helpers

Use the module-level `trace` and `startTrace` functions when you don't want to manage a client instance:

```ts
import { configure, startTrace, trace } from "@sepurux/recorder";

configure(); // reads SEPURUX_* env vars

// Callback style
await trace("checkout", { orderId: "o-99" }, async (rec) => {
  rec.modelStep("validate", { orderId: "o-99" });
});

// Imperative style
const recorder = startTrace("checkout", { orderId: "o-99" });
recorder.modelStep("validate", { orderId: "o-99" });
await recorder.flush();
```

## Environment variables

- `SEPURUX_API_BASE_URL` (defaults to `http://localhost:8000`)
- `SEPURUX_API_KEY`
- `SEPURUX_PROJECT_ID`
- `SEPURUX_CAMPAIGN_ID` if you want the trace to enqueue a run automatically

## Release

- Push a tag in the format `ts-recorder-v0.3.0` (must match `package.json` version).
- GitHub Actions workflow `ts-recorder-publish-npm.yml` will test, pack, and publish to npm.
- Required repo secret: `NPM_TOKEN`.
