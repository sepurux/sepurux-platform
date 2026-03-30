import type { Metadata } from "next";

import { DocsCodeBlock, DocsSection, DocsShell } from "@/components/docs/docs-shell";
import { DocsCodeTabs } from "@/components/docs/docs-code-tabs";
import { buildPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Getting Started",
  description:
    "Set up Sepurux quickly: install the SDK, set environment variables, record your first trace, and run your first campaign.",
  path: "/docs/getting-started",
});

const envSnippet = `SEPURUX_API_BASE_URL=${siteConfig.appUrl}/api/backend
SEPURUX_API_KEY=<project_api_key>
SEPURUX_PROJECT_ID=<project_uuid>
SEPURUX_CAMPAIGN_ID=<campaign_uuid>`;

const installTabs = [
  {
    lang: "python",
    label: "Python",
    code: `pip install sepurux`,
  },
  {
    lang: "typescript",
    label: "TypeScript",
    code: `npm install @sepurux/recorder`,
  },
  {
    lang: "go",
    label: "Go",
    code: `go get github.com/sepurux/go-recorder@latest`,
  },
  {
    lang: "curl",
    label: "curl",
    code: `# No install needed — use curl directly with any HTTP client.`,
  },
];

const firstTraceTabs = [
  {
    lang: "python",
    label: "Python",
    code: `from sepurux import SepuruxClient

client = SepuruxClient.from_env()

with client.trace("customer_refund_flow", {"ticket_id": "t-101"}) as trace:
    trace.model_step("classify_ticket", {"ticket_id": "t-101"})
    trace.tool_call("payments.refund", {"payment_id": "pay_123", "amount": 4200})
    trace.tool_result("payments.refund", {"refund_id": "rf_123", "status": "queued"})

print(trace.trace_id)`,
  },
  {
    lang: "typescript",
    label: "TypeScript",
    code: `import { SepuruxClient } from "@sepurux/recorder";

const client = SepuruxClient.fromEnv();

// Callback pattern — trace uploads automatically on exit
const recorder = await client.trace(
  "customer_refund_flow",
  { ticketId: "t-101" },
  async (trace) => {
    trace.modelStep("classify_ticket", { ticketId: "t-101" });
    trace.toolCall("payments.refund", { paymentId: "pay_123", amount: 4200 });
    trace.toolResult("payments.refund", { refundId: "rf_123", status: "queued" });
  },
);

console.log(recorder.traceId);

// Imperative pattern — useful for middleware or streaming handlers
const rec = client.startTrace("customer_refund_flow", { ticketId: "t-101" });
rec.modelStep("classify_ticket", { ticketId: "t-101" });
rec.toolCall("payments.refund", { paymentId: "pay_123", amount: 4200 });
rec.toolResult("payments.refund", { refundId: "rf_123", status: "queued" });
const { traceId } = await rec.flush();
console.log(traceId);`,
  },
  {
    lang: "go",
    label: "Go",
    code: `import (
  "context"
  "fmt"
  sepuruxrecorder "github.com/sepurux/go-recorder"
)

client, _ := sepuruxrecorder.NewClientFromEnv()

recorder, _ := client.Trace(
  context.Background(),
  "customer_refund_flow",
  map[string]any{"ticketId": "t-101"},
  sepuruxrecorder.TraceOptions{},
  func(trace *sepuruxrecorder.ManagedRecorder) error {
    trace.ModelStep("classify_ticket", map[string]any{"ticketId": "t-101"}, nil)
    trace.ToolCall("payments.refund", map[string]any{"paymentId": "pay_123", "amount": 4200})
    trace.ToolResult("payments.refund", map[string]any{"refundId": "rf_123", "status": "queued"})
    return nil
  },
)

fmt.Println(recorder.TraceID)`,
  },
  {
    lang: "curl",
    label: "curl",
    code: `curl -X POST $SEPURUX_API_BASE_URL/v1/traces \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $SEPURUX_API_KEY" \\
  -H "X-Project-Id: $SEPURUX_PROJECT_ID" \\
  -d '{
    "trace_version": "0.1",
    "source": "getting_started",
    "task": {"name": "customer_refund_flow"},
    "events": [
      {"type": "model", "name": "classify_ticket", "input": {"ticket_id": "t-101"}},
      {"type": "tool_call", "tool": "payments.refund", "input": {"amount": 4200}}
    ]
  }'`,
  },
];

const basicBuilderSnippet = `# In the app UI:
# 1) Open Mutation Packs -> Create Mutation Pack
# 2) Select Basic Builder and choose a preset + intensity
# 3) Optional: paste trace_id and click "Load Tools"
# 4) Save, then copy mutation_pack_id from the packs table`;

const runWithPackTabs = [
  {
    lang: "python",
    label: "Python",
    code: `import os
from sepurux import SepuruxClient

client = SepuruxClient.from_env()

with client.trace(
    "customer_refund_flow",
    {"ticket_id": "t-101"},
    campaign_id=os.environ["SEPURUX_CAMPAIGN_ID"],
    mutation_pack="sepurux.core.reliability",
) as trace:
    trace.model_step("classify_ticket", {"ticket_id": "t-101"})
    trace.tool_call("payments.refund", {"payment_id": "pay_123", "amount": 4200})
    trace.tool_result("payments.refund", {"refund_id": "rf_123", "status": "queued"})

print(trace.trace_id)
print(trace.run_id)`,
  },
  {
    lang: "typescript",
    label: "TypeScript",
    code: `import { SepuruxClient } from "@sepurux/recorder";

const client = SepuruxClient.fromEnv();

const recorder = await client.trace(
  "customer_refund_flow",
  { ticketId: "t-101" },
  async (trace) => {
    trace.modelStep("classify_ticket", { ticketId: "t-101" });
    trace.toolCall("payments.refund", { paymentId: "pay_123", amount: 4200 });
    trace.toolResult("payments.refund", { refundId: "rf_123", status: "queued" });
  },
  {
    campaignId: process.env.SEPURUX_CAMPAIGN_ID,
    mutationPack: "sepurux.core.reliability",
  },
);

console.log(recorder.traceId);
console.log(recorder.runId);`,
  },
  {
    lang: "go",
    label: "Go",
    code: `import (
  "context"
  "fmt"
  "os"
  sepuruxrecorder "github.com/sepurux/go-recorder"
)

client, _ := sepuruxrecorder.NewClientFromEnv()

recorder, _ := client.Trace(
  context.Background(),
  "customer_refund_flow",
  map[string]any{"ticketId": "t-101"},
  sepuruxrecorder.TraceOptions{
    CampaignID:   os.Getenv("SEPURUX_CAMPAIGN_ID"),
    MutationPack: "sepurux.core.reliability",
  },
  func(trace *sepuruxrecorder.ManagedRecorder) error {
    trace.ModelStep("classify_ticket", map[string]any{"ticketId": "t-101"}, nil)
    trace.ToolCall("payments.refund", map[string]any{"paymentId": "pay_123", "amount": 4200})
    trace.ToolResult("payments.refund", map[string]any{"refundId": "rf_123", "status": "queued"})
    return nil
  },
)

fmt.Println(recorder.TraceID)
fmt.Println(recorder.RunID)`,
  },
  {
    lang: "curl",
    label: "curl",
    code: `# Step 1: upload the trace (see "First Trace" above), then:
curl -X POST $SEPURUX_API_BASE_URL/v1/runs \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $SEPURUX_API_KEY" \\
  -H "X-Project-Id: $SEPURUX_PROJECT_ID" \\
  -d '{
    "trace_id": "<trace_uuid>",
    "campaign_id": "<campaign_uuid>",
    "mutation_pack_id": "<mutation_pack_uuid>"
  }'`,
  },
];

export default function GettingStartedPage() {
  return (
    <DocsShell
      kicker="Docs / Getting Started"
      title="Go from zero to your first reliability run."
      description="This guide gets a team from initial setup to a working trace and campaign execution path with production-safe defaults."
      nav={[
        { href: "#prerequisites", label: "Prerequisites" },
        { href: "#install", label: "Install" },
        { href: "#environment", label: "Environment Setup" },
        { href: "#first-trace", label: "First Trace" },
        { href: "#openai", label: "OpenAI" },
        { href: "#langchain", label: "LangChain" },
        { href: "#basic-builder", label: "Basic Builder" },
        { href: "#first-run", label: "First Run" },
      ]}
      actions={[
        { href: "/docs/api-reference", label: "API guide" },
        { href: "/docs/ci-cd", label: "CI/CD guide" },
      ]}
    >
      <DocsSection
        id="prerequisites"
        title="Prerequisites"
        description="Before writing code, make sure you have the right project-level credentials."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Project API key", "Generate from the Sepurux app workspace settings."],
            ["Project ID", "Use a project-scoped UUID for all /v1 requests."],
            ["Campaign ID", "Create one campaign first, then reuse it in SDK and CI."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-[--border] bg-white shadow-sm p-4">
              <p className="text-sm font-semibold text-[--text-primary]">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </DocsSection>

      <DocsSection
        id="install"
        title="Install"
        description="Add the Sepurux SDK for your language. Each SDK provides an ergonomic recorder API and auto-uploads traces on exit."
      >
        <DocsCodeTabs tabs={installTabs} />
      </DocsSection>

      <DocsSection
        id="environment"
        title="Environment Setup"
        description="Define these variables once in your local shell, .env file, or CI secrets."
      >
        <DocsCodeBlock code={envSnippet} label="env" />
      </DocsSection>

      <DocsSection
        id="first-trace"
        title="Record Your First Trace"
        description="Instrument one agent workflow and confirm the trace appears in the Sepurux dashboard."
      >
        <DocsCodeTabs tabs={firstTraceTabs} />
      </DocsSection>

      <DocsSection
        id="openai"
        title="OpenAI Integration"
        description="instrument_openai wraps any openai.OpenAI client and records every chat.completions.create call automatically — no manual trace.model_step() needed."
      >
        <DocsCodeBlock
          label="python"
          code={`import openai
from sepurux import SepuruxClient
from sepurux.integrations.openai import instrument_openai

client = SepuruxClient.from_env()
openai_client = openai.OpenAI()

with client.trace(
    "customer_refund_flow",
    {"ticket_id": "t-101"},
    campaign_id=os.environ["SEPURUX_CAMPAIGN_ID"],
) as trace:
    ai = instrument_openai(openai_client, recorder=trace)
    response = ai.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "Classify this support ticket"}],
    )

print(trace.trace_id)
print(trace.run_id)`}
        />
        <div className="rounded-2xl border border-[--border] bg-white shadow-sm p-4 text-sm text-slate-600">
          Requires <code className="text-[--text-primary]">pip install openai</code>. Records <code className="text-[--text-primary]">llm_call</code> with model, messages, output, and latency. Tool calls returned by the model are automatically recorded as <code className="text-[--text-primary]">tool_call</code> events.
        </div>
      </DocsSection>

      <DocsSection
        id="langchain"
        title="LangChain Integration"
        description="SepuruxCallbackHandler records LLM calls, tool calls, and agent outputs from any LangChain chain or agent automatically — no manual instrumentation."
      >
        <DocsCodeBlock
          label="python"
          code={`from sepurux.integrations.langchain import SepuruxCallbackHandler

handler = SepuruxCallbackHandler(
    "customer_refund_flow",
    {"ticket_id": "t-101"},
    campaign_id=os.environ["SEPURUX_CAMPAIGN_ID"],
)

# Pass to any LangChain chain, agent, or LLM
result = agent_executor.invoke(
    {"input": "Process refund for ticket t-101"},
    config={"callbacks": [handler]},
)

# Upload trace and start reliability run
handler.finish()
print(handler.trace_id)
print(handler.run_id)

# Or use as a context manager — finish() is called automatically
with SepuruxCallbackHandler("refund_flow", campaign_id="...") as handler:
    result = chain.invoke(inputs, config={"callbacks": [handler]})`}
        />
        <div className="rounded-2xl border border-[--border] bg-white shadow-sm p-4 text-sm text-slate-600">
          Requires <code className="text-[--text-primary]">pip install langchain-core</code>. Records LLM calls with latency, tool call/result pairs, and final agent output.
        </div>
      </DocsSection>

      <DocsSection
        id="basic-builder"
        title="Create a Mutation Pack"
        description="Use the Basic Builder in the app to generate valid mutation packs without hand-writing JSON."
      >
        <DocsCodeBlock code={basicBuilderSnippet} label="steps" />
      </DocsSection>

      <DocsSection
        id="first-run"
        title="Run with Trace + Campaign + Mutation Pack"
        description="Pass campaign_id and mutation_pack when recording to auto-enqueue a reliability run on trace upload."
      >
        <DocsCodeTabs tabs={runWithPackTabs} />
      </DocsSection>
    </DocsShell>
  );
}
