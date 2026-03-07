const assert = require("node:assert/strict");
const test = require("node:test");

const { TraceRecorder } = require("../dist/index.js");

test("toTrace includes trace_version and task payload", () => {
  const recorder = new TraceRecorder("demo-task", { userId: "u-1" });
  recorder.modelStep("planner", { prompt: "hello" }, { plan: "call tool" });

  const trace = recorder.toTrace();

  assert.equal(trace.trace_version, "0.1");
  assert.equal(trace.task.name, "demo-task");
  assert.deepEqual(trace.task.input, { userId: "u-1" });
  assert.equal(trace.events.length, 1);
  assert.equal(trace.events[0].type, "model_step");
});

test("toolCall and toolResult preserve event ordering", () => {
  const recorder = new TraceRecorder("demo-task");
  recorder.toolCall("jira.create_issue", { title: "Bug" });
  recorder.toolResult("jira.create_issue", { key: "OPS-123" });

  const trace = recorder.toTrace();

  assert.equal(trace.events.length, 2);
  assert.equal(trace.events[0].index, 0);
  assert.equal(trace.events[1].index, 1);
  assert.equal(trace.events[0].type, "tool_call");
  assert.equal(trace.events[1].type, "tool_result");
  assert.equal(trace.events[0].tool, "jira.create_issue");
  assert.equal(trace.events[1].tool, "jira.create_issue");
  assert.ok(trace.events[0].timestamp);
  assert.ok(trace.events[1].timestamp);
});
