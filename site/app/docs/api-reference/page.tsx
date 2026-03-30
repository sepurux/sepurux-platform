import type { Metadata } from "next";

import { DocsCodeBlock, DocsSection, DocsShell } from "@/components/docs/docs-shell";
import { DocsCodeTabs } from "@/components/docs/docs-code-tabs";
import { buildPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "API Reference Guide",
  description:
    "Core Sepurux API patterns: base URL, auth headers, key endpoints, and production-ready request examples.",
  path: "/docs/api-reference",
});

const baseUrl = `${siteConfig.appUrl}/api/backend`;

const headersSnippet = `X-API-Key: <project_api_key>
X-Project-Id: <project_uuid>
Content-Type: application/json`;

const createTraceTabs = [
  {
    lang: "python",
    label: "Python",
    code: `from sepurux import SepuruxClient

client = SepuruxClient.from_env()

with client.trace("refund_flow", {"ticket_id": "t-101"}) as trace:
    trace.model_step("triage", {"text": "process refund"})
    trace.tool_call("payments.refund", {"amount": 4200})
    trace.tool_result("payments.refund", {"status": "queued"})

print(trace.trace_id)`,
  },
  {
    lang: "typescript",
    label: "TypeScript",
    code: `import { SepuruxClient } from "@sepurux/recorder";

const client = SepuruxClient.fromEnv();

const recorder = await client.trace(
  "refund_flow",
  { ticketId: "t-101" },
  async (trace) => {
    trace.modelStep("triage", { text: "process refund" });
    trace.toolCall("payments.refund", { amount: 4200 });
    trace.toolResult("payments.refund", { status: "queued" });
  },
);

console.log(recorder.traceId);`,
  },
  {
    lang: "go",
    label: "Go",
    code: `client, _ := sepuruxrecorder.NewClientFromEnv()

recorder, _ := client.Trace(
  ctx, "refund_flow",
  map[string]any{"ticketId": "t-101"},
  sepuruxrecorder.TraceOptions{},
  func(trace *sepuruxrecorder.ManagedRecorder) error {
    trace.ModelStep("triage", map[string]any{"text": "process refund"}, nil)
    trace.ToolCall("payments.refund", map[string]any{"amount": 4200})
    trace.ToolResult("payments.refund", map[string]any{"status": "queued"})
    return nil
  },
)`,
  },
  {
    lang: "curl",
    label: "curl",
    code: `curl -X POST ${baseUrl}/v1/traces \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $SEPURUX_API_KEY" \\
  -H "X-Project-Id: $SEPURUX_PROJECT_ID" \\
  -d '{"trace_version":"0.1","task":{"name":"refund_flow"},"events":[]}'`,
  },
];

const startRunTabs = [
  {
    lang: "python",
    label: "Python",
    code: `import time
from sepurux import SepuruxClient

client = SepuruxClient.from_env()

run_id = client.start_run(
    trace_id="<trace_uuid>",
    campaign_id="<campaign_uuid>",
)

# Poll until terminal
while True:
    run = client.get_run(run_id)
    if run["status"] in {"completed", "failed"}:
        break
    time.sleep(5)

print(run["status"], run.get("summary", {}).get("pass_rate"))`,
  },
  {
    lang: "typescript",
    label: "TypeScript",
    code: `import { SepuruxClient } from "@sepurux/recorder";

const client = SepuruxClient.fromEnv();

// Pass campaignId in trace() options to auto-start a run:
const recorder = await client.trace(
  "refund_flow",
  { ticketId: "t-101" },
  async (trace) => { /* ... */ },
  { campaignId: process.env.SEPURUX_CAMPAIGN_ID },
);

console.log(recorder.runId);`,
  },
  {
    lang: "go",
    label: "Go",
    code: `// Pass CampaignID in TraceOptions to auto-start a run:
recorder, _ := client.Trace(
  ctx, "refund_flow",
  map[string]any{"ticketId": "t-101"},
  sepuruxrecorder.TraceOptions{
    CampaignID: os.Getenv("SEPURUX_CAMPAIGN_ID"),
  },
  func(trace *sepuruxrecorder.ManagedRecorder) error {
    // ...
    return nil
  },
)

fmt.Println(recorder.RunID)`,
  },
  {
    lang: "curl",
    label: "curl",
    code: `curl -X POST ${baseUrl}/v1/runs \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $SEPURUX_API_KEY" \\
  -H "X-Project-Id: $SEPURUX_PROJECT_ID" \\
  -d '{
    "trace_id": "<trace_uuid>",
    "campaign_id": "<campaign_uuid>"
  }'`,
  },
];

const evalSetSnippet = `# Register real-world traces as the scenario pool for a campaign.
# CI runs against this campaign will replay every registered trace.
curl -X PATCH ${baseUrl}/v1/campaigns/<campaign_uuid>/eval-set \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $SEPURUX_API_KEY" \\
  -H "X-Project-Id: $SEPURUX_PROJECT_ID" \\
  -d '{
    "add_trace_ids": ["<trace_uuid_1>", "<trace_uuid_2>"],
    "min_scenarios": 3
  }'`;

const batchSnippet = `# When the campaign has an eval-set, POST /v1/ci/runs creates one run
# per registered trace and returns a shared batch_id.
POST /v1/ci/runs
{
  "campaign_id": "<campaign_uuid>",
  "thresholds": { "min_pass_rate": 0.85, "max_unsafe": 0, "max_failures": 0 }
}
# → { "run_id": "...", "run_ids": ["...", "..."], "trace_count": 3, "ci_batch_id": "..." }

# Poll the aggregated verdict — pass only when ALL scenario runs pass.
GET /v1/ci/batch/<batch_uuid>
# → {
#     "status": "done",
#     "decision": "pass",
#     "pass_rate": 0.91,
#     "scenario_coverage_pct": 100.0,
#     "trace_count": 3
#   }`;

const endpoints = [
  ["POST /v1/traces", "Upload trace payloads from SDK or custom instrumentation."],
  ["POST /v1/campaigns", "Create campaign definitions for replay and mutation execution."],
  ["PATCH /v1/campaigns/{id}/eval-set", "Register real-world traces as the CI scenario pool and configure min_scenarios gate."],
  ["POST /v1/runs", "Queue run execution for a trace and campaign pair."],
  ["GET /v1/runs/{run_id}", "Fetch run status, summary, and scoring context."],
  ["GET /v1/runs/{run_id}/policy-events", "Inspect policy decisions recorded during execution."],
  ["GET /v1/runs/{run_id}/security-events", "Inspect security actions and risk context by attempt."],
  ["POST /v1/ci/runs", "Create a CI evaluation run (or batch when eval-set traces are registered)."],
  ["GET /v1/ci/runs/{run_id}", "Poll single CI run pass/fail decision and dashboard URL."],
  ["GET /v1/ci/batch/{batch_id}", "Aggregate pass/fail verdict across a batch of scenario runs."],
  ["PATCH /v1/mutation-packs/{id}", "Update name, description, or config on a custom mutation pack."],
  ["DELETE /v1/mutation-packs/{id}", "Delete a custom (non-system) mutation pack."],
];

export default function APIReferencePage() {
  return (
    <DocsShell
      kicker="Docs / API"
      title="API reference guide for engineers."
      description="Use this page as the fast path for integrating Sepurux endpoints into apps, workers, and CI systems."
      nav={[
        { href: "#auth", label: "Base URL & Auth" },
        { href: "#endpoints", label: "Core Endpoints" },
        { href: "#examples", label: "Request Examples" },
        { href: "#eval-set", label: "Eval-Set & Batch CI" },
        { href: "#schema", label: "Schema & Explorer" },
      ]}
      actions={[
        { href: `${baseUrl}/docs`, label: "Open API explorer", external: true },
        { href: `${baseUrl}/openapi.json`, label: "Download OpenAPI", external: true },
      ]}
    >
      <DocsSection
        id="auth"
        title="Base URL & Auth"
        description="All project-scoped `/v1` endpoints require `X-API-Key` and `X-Project-Id` headers."
      >
        <div className="rounded-2xl border border-[--border] bg-white shadow-sm px-4 py-3 text-sm text-slate-700">
          Base URL: <code>{baseUrl}</code>
        </div>
        <DocsCodeBlock code={headersSnippet} label="required headers" />
      </DocsSection>

      <DocsSection
        id="endpoints"
        title="Core Endpoints"
        description="These are the most common endpoints used by product teams and platform engineers."
      >
        <div className="overflow-hidden rounded-2xl border border-[--border]">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-white shadow-sm">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Endpoint</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {endpoints.map(([endpoint, purpose]) => (
                <tr key={endpoint}>
                  <td className="px-4 py-3 font-mono text-xs text-[--text-primary]">{endpoint}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocsSection>

      <DocsSection
        id="examples"
        title="Request Examples"
        description="Start from these examples and expand payloads based on your workflow semantics."
      >
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Create trace</p>
        <DocsCodeTabs tabs={createTraceTabs} />
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Start run</p>
        <DocsCodeTabs tabs={startRunTabs} />
      </DocsSection>

      <DocsSection
        id="eval-set"
        title="Eval-Set & Batch CI"
        description="Register a pool of real-world traces against a campaign. CI runs then replay every registered trace in parallel and gate on the aggregated verdict."
      >
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Register trace pool</p>
        <DocsCodeBlock code={evalSetSnippet} label="bash" />
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Batch run + poll</p>
        <DocsCodeBlock code={batchSnippet} label="bash" />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["add_trace_ids / remove_trace_ids", "Incrementally build or trim the scenario pool. Accepts arrays of trace UUIDs."],
            ["min_scenarios", "CI submission is rejected (422) if the registered pool falls below this count. Prevents gating against a trivially small scenario set."],
            ["scenario_coverage_pct", "Returned by the batch endpoint: completed runs / total traces × 100. Use this to verify full coverage before acting on the verdict."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-[--border] bg-white shadow-sm p-4">
              <p className="text-sm font-semibold text-[--text-primary]">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </DocsSection>

      <DocsSection
        id="schema"
        title="Schema & Explorer"
        description="Use the interactive docs for request/response validation and the OpenAPI file for client generation."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <a
            href={`${baseUrl}/docs`}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-[--border] bg-white shadow-sm p-4 text-sm text-slate-700 transition-colors hover:bg-[--surface-2]"
          >
            Interactive Docs: <code>{baseUrl}/docs</code>
          </a>
          <a
            href={`${baseUrl}/openapi.json`}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-[--border] bg-white shadow-sm p-4 text-sm text-slate-700 transition-colors hover:bg-[--surface-2]"
          >
            OpenAPI Schema: <code>{baseUrl}/openapi.json</code>
          </a>
        </div>
      </DocsSection>
    </DocsShell>
  );
}
