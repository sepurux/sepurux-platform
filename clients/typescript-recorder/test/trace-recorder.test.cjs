const assert = require("node:assert/strict");
const test = require("node:test");

const {
  SepuruxClient,
  TraceRecorder,
  configure,
  trace,
} = require("../dist/index.js");

test("toTrace remains available for low-level compatibility", () => {
  const recorder = new TraceRecorder("demo-task", { userId: "u-1" });
  recorder.modelStep("planner", { prompt: "hello" }, { plan: "call tool" });

  const tracePayload = recorder.toTrace();

  assert.equal(tracePayload.trace_version, "0.1");
  assert.equal(tracePayload.task.name, "demo-task");
  assert.deepEqual(tracePayload.task.input, { userId: "u-1" });
  assert.equal(tracePayload.events.length, 1);
  assert.equal(tracePayload.events[0].type, "model_step");
});

test("SepuruxClient.trace uploads traces and starts runs", async () => {
  const requests = [];
  const client = new SepuruxClient({
    baseUrl: "http://localhost:8000",
    apiKey: "key-1",
    projectId: "project-1",
    fetchImpl: async (input, init = {}) => {
      requests.push({ input, init });
      if (input.endsWith("/v1/traces")) {
        return response(201, { trace_id: "trace-123" });
      }
      if (input.endsWith("/v1/ci/runs")) {
        return response(201, { batch_id: "batch-456" });
      }
      return response(404, { detail: "not found" });
    },
  });

  const recorder = await client.trace(
    "demo-task",
    { userId: "u-1" },
    async (run) => {
      run.toolCall("jira.create_issue", { title: "Bug" });
      run.toolResult("jira.create_issue", { key: "OPS-123" });
    },
    { campaignId: "campaign-123" },
  );

  assert.equal(recorder.traceId, "trace-123");
  assert.equal(recorder.batchId, "batch-456");
  assert.equal(recorder.runId, "batch-456");
  assert.equal(requests.length, 2);
  assert.equal(requests[0].input, "http://localhost:8000/v1/traces");
  assert.equal(requests[1].input, "http://localhost:8000/v1/ci/runs");
  assert.equal(requests[0].init.headers["X-API-Key"], "key-1");
  assert.equal(requests[0].init.headers["X-Project-Id"], "project-1");
});

test("SepuruxClient.trace uses run-pack endpoint when mutationPack is set", async () => {
  const requests = [];
  const client = new SepuruxClient({
    baseUrl: "http://localhost:8000",
    fetchImpl: async (input, init = {}) => {
      requests.push({ input, init });
      if (input.endsWith("/v1/traces")) {
        return response(201, { trace_id: "trace-123" });
      }
      if (input.endsWith("/v1/campaigns/campaign-123/run-pack")) {
        return response(201, { run_id: "run-789" });
      }
      return response(404, { detail: "not found" });
    },
  });

  const recorder = await client.trace(
    "demo-task",
    {},
    async (run) => {
      run.modelStep("planner", { prompt: "hello" }, { action: "open_issue" });
    },
    { campaignId: "campaign-123", mutationPack: "core.reliability" },
  );

  assert.equal(recorder.runId, "run-789");
  assert.equal(requests[1].input, "http://localhost:8000/v1/campaigns/campaign-123/run-pack");
});

test("configure + trace use the default client", async () => {
  const requests = [];
  configure({
    baseUrl: "http://localhost:8000",
    fetchImpl: async (input, init = {}) => {
      requests.push({ input, init });
      if (input.endsWith("/v1/traces")) {
        return response(201, { trace_id: "trace-321" });
      }
      return response(404, { detail: "not found" });
    },
  });

  const recorder = await trace(
    "demo-task",
    { ticketId: 123 },
    async (run) => {
      run.modelStep("planner", { prompt: "triage issue" }, { plan: "call jira" });
    },
  );

  assert.equal(recorder.traceId, "trace-321");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].input, "http://localhost:8000/v1/traces");
});

function response(status, payload) {
  const text = payload === null ? "" : JSON.stringify(payload);
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    },
    async text() {
      return text;
    },
  };
}
