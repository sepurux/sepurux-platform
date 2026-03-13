# Sepurux TypeScript Recorder

`@sepurux/recorder` provides the recommended TypeScript integration path for Sepurux:
env-aware client setup, managed trace upload, and optional campaign execution.

## API

- `SepuruxClient.fromEnv()`
- `client.trace(taskName, taskInput, handler, options?)`
- `client.startTrace(taskName, taskInput, options?)`
- `configure(...)`
- `trace(taskName, taskInput, handler, options?)`
- Low-level compatibility: `TraceRecorder.buildTrace()`

## Quick start

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

Set these environment variables first:
- `SEPURUX_API_BASE_URL` (defaults to `http://localhost:8000`)
- `SEPURUX_API_KEY`
- `SEPURUX_PROJECT_ID`
- `SEPURUX_CAMPAIGN_ID` if you want the trace to enqueue a run automatically

## Release

- Push a tag in the format `ts-recorder-v0.3.0` (must match `package.json` version).
- GitHub Actions workflow `ts-recorder-publish-npm.yml` will test, pack, and publish to npm.
- Required repo secret: `NPM_TOKEN`.
