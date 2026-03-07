# Crash Lab TypeScript Recorder

`crashlab-typescript-recorder` provides a lightweight helper for building
Crash Lab trace payloads (`trace_version = 0.1`) in non-Python projects.

## API

- `new TraceRecorder(taskName, taskInput?)`
- `modelStep(name, input, output?)`
- `toolCall(tool, args)`
- `toolResult(tool, result)`
- `error(message, tool?)`
- `toTrace()`

## Example (with generated TypeScript client)

```ts
import { Configuration, RunsApi, TracesApi } from "crashlab-client";
import { TraceRecorder } from "crashlab-typescript-recorder";

const recorder = new TraceRecorder("issue-triage", { issueId: 123 });
recorder.modelStep("planner", { prompt: "triage issue" }, { plan: "call jira" });
recorder.toolCall("jira.create_issue", { project: "OPS", title: "Bug" });
recorder.toolResult("jira.create_issue", { key: "OPS-123" });

const config = new Configuration({
  basePath: process.env.CRASHLAB_BASE_URL ?? "http://localhost:8000",
  headers: { "X-API-Key": process.env.CRASHLAB_API_KEY ?? "" },
});

const tracesApi = new TracesApi(config);
const trace = await tracesApi.postTraceV1TracesPost({
  xProjectId: process.env.CRASHLAB_PROJECT_ID ?? "",
  body: recorder.toTrace(),
});

const runsApi = new RunsApi(config);
await runsApi.postRunV1RunsPost({
  xProjectId: process.env.CRASHLAB_PROJECT_ID ?? "",
  runCreateRequest: {
    trace_id: trace.trace_id,
    campaign_id: process.env.CRASHLAB_CAMPAIGN_ID ?? "",
  },
});
```

## Release

- Push a tag in the format `ts-recorder-vX.Y.Z` (must match `package.json` version).
- GitHub Actions workflow `ts-recorder-publish-npm.yml` will test, pack, and publish to npm.
- Required repo secret: `NPM_TOKEN`.
