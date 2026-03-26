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

const endpoints = [
  ["POST /v1/traces", "Upload trace payloads from SDK or custom instrumentation."],
  ["POST /v1/campaigns", "Create campaign definitions for replay and mutation execution."],
  ["POST /v1/runs", "Queue run execution for a trace and campaign pair."],
  ["GET /v1/runs/{run_id}", "Fetch run status, summary, and scoring context."],
  ["GET /v1/runs/{run_id}/policy-events", "Inspect policy decisions recorded during execution."],
  ["GET /v1/runs/{run_id}/security-events", "Inspect security actions and risk context by attempt."],
  ["POST /v1/ci/runs", "Create a CI evaluation run with threshold gating."],
  ["GET /v1/ci/runs/{run_id}", "Poll CI pass/fail decision and dashboard URL."],
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
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-neutral-200">
          Base URL: <code>{baseUrl}</code>
        </div>
        <DocsCodeBlock code={headersSnippet} label="required headers" />
      </DocsSection>

      <DocsSection
        id="endpoints"
        title="Core Endpoints"
        description="These are the most common endpoints used by product teams and platform engineers."
      >
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-left">
            <thead className="bg-white/[0.03]">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Endpoint</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-black/50">
              {endpoints.map(([endpoint, purpose]) => (
                <tr key={endpoint}>
                  <td className="px-4 py-3 font-mono text-xs text-white">{endpoint}</td>
                  <td className="px-4 py-3 text-sm text-neutral-300">{purpose}</td>
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
        <p className="text-xs uppercase tracking-[0.14em] text-white/50">Create trace</p>
        <DocsCodeTabs tabs={createTraceTabs} />
        <p className="text-xs uppercase tracking-[0.14em] text-white/50">Start run</p>
        <DocsCodeTabs tabs={startRunTabs} />
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
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-200 transition-colors hover:bg-white/[0.06]"
          >
            Interactive Docs: <code>{baseUrl}/docs</code>
          </a>
          <a
            href={`${baseUrl}/openapi.json`}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-200 transition-colors hover:bg-white/[0.06]"
          >
            OpenAPI Schema: <code>{baseUrl}/openapi.json</code>
          </a>
        </div>
      </DocsSection>
    </DocsShell>
  );
}
