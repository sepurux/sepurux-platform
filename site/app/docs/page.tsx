import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { buildPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Docs",
  description:
    "Common Sepurux use cases for the hosted API, Python SDK, generated clients, campaigns, mutation packs, policy packs, and security controls.",
  path: "/docs",
});

const useCases = [
  {
    href: "#sdk",
    title: "Capture traces from your application",
    recommendation: "Python SDK with project API key and project UUID",
  },
  {
    href: "#campaigns",
    title: "Create a campaign and run seeded reliability checks",
    recommendation: "Campaign API plus a seeded pack like sepurux.core.reliability",
  },
  {
    href: "#mutation-packs",
    title: "Create team-specific mutation packs",
    recommendation: "Project-scoped custom packs for tool schema drift and timeout behavior",
  },
  {
    href: "#clients",
    title: "Use TypeScript and Go clients",
    recommendation: "Env-aware recorder clients with automatic trace upload and optional run execution",
  },
  {
    href: "#policy-security",
    title: "Gate risky workflows with policy and security controls",
    recommendation: "Admin-managed policy packs and tool zoning",
  },
  {
    href: "#api",
    title: "Call Sepurux directly over HTTP",
    recommendation: "Hosted API through app.sepurux.dev/api/backend",
  },
];

const seededPacks = [
  "sepurux.max_chaos",
  "sepurux.core.reliability",
  "core.reliability",
  "core.latency",
  "prompt.injection",
  "tool.schema.break",
];

function DocsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-slate-200 pt-10 first:border-t-0 first:pt-0">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 md:text-[15px]">{description}</p>
      <div className="mt-6 space-y-6">{children}</div>
    </section>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#f8fafc]">
      {label ? (
        <div className="border-b border-slate-200 bg-[#f1f5f9] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </div>
      ) : null}
      <pre className="overflow-x-auto px-4 py-4 text-xs leading-6 text-[#334155] md:px-5 md:py-5">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function DocsPage() {
  const apiBaseUrl = `${siteConfig.appUrl}/api/backend`;
  const openApiUrl = `${apiBaseUrl}/openapi.json`;
  const referenceUrl = `${apiBaseUrl}/docs`;

  const envSnippet = `SEPURUX_API_BASE_URL=${apiBaseUrl}
SEPURUX_UI_BASE_URL=${siteConfig.appUrl}
SEPURUX_API_KEY=<project_api_key>
SEPURUX_PROJECT_ID=<project_uuid>
SEPURUX_CAMPAIGN_ID=<campaign_uuid>
SEPURUX_MUTATION_PACK=sepurux.core.reliability`;

  const sdkSnippet = `import os
from sepurux import SepuruxClient

with SepuruxClient.from_env() as client:
    with client.trace(
        "refund_flow",
        {"channel": "support"},
        campaign_id=os.environ["SEPURUX_CAMPAIGN_ID"],
        mutation_pack=os.environ["SEPURUX_MUTATION_PACK"],
        source="python-sdk",
    ) as trace:
        trace.model_step(
            "triage_request",
            {"text": "Refund the duplicate charge"},
            output={"action": "refund", "risk": "medium"},
        )
        trace.tool_call(
            "payments.refund",
            {"payment_id": "pay_123", "amount": 4200},
        )
        trace.tool_result(
            "payments.refund",
            {"refund_id": "rf_123", "status": "queued"},
        )

    print(trace.trace_id)
    print(trace.run_id)`;

  const traceableSnippet = `from sepurux import configure, traceable

configure()

@traceable(campaign_id="refund_reliability")
def score_refund_risk(amount: int, currency: str) -> dict:
    return {
        "risk": "medium",
        "approve": amount < 10000,
        "currency": currency,
    }

print(score_refund_risk(4200, "usd"))`;

  const sdkInstallSnippet = `# current repository install path
pip install -e sdk`;

  const campaignSnippet = `curl -X POST ${apiBaseUrl}/v1/campaigns \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $SEPURUX_API_KEY" \\
  -H "X-Project-Id: $SEPURUX_PROJECT_ID" \\
  -d '{
    "name": "refund_reliability",
    "mutation_set": [
      {
        "mutation_id": "baseline.refund",
        "tool": "payments.refund"
      }
    ],
    "eval_set": {
      "checks": ["status", "reason", "tool"]
    }
  }'

curl -X POST ${apiBaseUrl}/v1/campaigns/$SEPURUX_CAMPAIGN_ID/run-pack \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $SEPURUX_API_KEY" \\
  -H "X-Project-Id: $SEPURUX_PROJECT_ID" \\
  -d '{
    "pack": "sepurux.core.reliability"
  }'`;

  const mutationPackSnippet = `curl -X POST ${apiBaseUrl}/v1/mutation-packs \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $SEPURUX_API_KEY" \\
  -H "X-Project-Id: $SEPURUX_PROJECT_ID" \\
  -d '{
    "name": "payments_resilience",
    "description": "Schema drift and timeout checks for refund flows",
    "config": {
      "version": "0.1",
      "suggested_attempts": 24,
      "max_mutations_per_attempt": 2,
      "mutations": [
        {
          "mutation_id": "rename-status",
          "type": "schema.rename_field",
          "target": {"tool": "payments.*"},
          "params": {"from": "status", "to": "state"},
          "probability": 1.0,
          "weight": 1.0
        },
        {
          "mutation_id": "timeout-refund",
          "type": "fault.timeout",
          "target": {"tool": "payments.refund"},
          "params": {"timeout_ms": 3000},
          "probability": 0.35,
          "weight": 1.0
        }
      ]
    }
  }'`;

  const policySecuritySnippet = `curl -X POST ${apiBaseUrl}/v1/policy-packs \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $SEPURUX_API_KEY" \\
  -H "X-Project-Id: $SEPURUX_PROJECT_ID" \\
  -d '{
    "name": "refund_approval",
    "engine": "builtin",
    "policy": {
      "version": "0.1",
      "defaults": {"unknown_tools": "allow"},
      "irreversible": {
        "tools": ["payments.refund", "jira.create_issue(commit)"]
      },
      "approval": {"token_field": "confirmation_token"}
    }
  }'

curl -X POST ${apiBaseUrl}/v1/tools \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $SEPURUX_API_KEY" \\
  -H "X-Project-Id: $SEPURUX_PROJECT_ID" \\
  -d '{
    "name": "payments.refund",
    "zone": "untrusted"
  }'`;

  const clientSnippet = `curl -fsSL "${openApiUrl}" -o clients/openapi.json

# Regenerate the low-level API clients from the running schema when needed.
make gen-clients`;

  const typescriptInstallSnippet = `npm install @sepurux/recorder`;

  const typescriptClientSnippet = `import { SepuruxClient } from "@sepurux/recorder";

const client = SepuruxClient.fromEnv();

const recorder = await client.trace(
  "refund_flow",
  { ticketId: "t-123" },
  async (trace) => {
    trace.modelStep("triage_request", { text: "Refund the duplicate charge" }, { action: "refund" });
    trace.toolCall("payments.refund", { payment_id: "pay_123", amount: 4200 });
    trace.toolResult("payments.refund", { refund_id: "rf_123", status: "queued" });
  },
  {
    campaignId: process.env.SEPURUX_CAMPAIGN_ID,
    mutationPack: "sepurux.core.reliability",
  },
);

console.log(recorder.traceId);
console.log(recorder.runId);`;

  const goInstallSnippet = `go get github.com/sepurux/go-recorder@v0.3.0`;

  const goClientSnippet = `package main

import (
  "context"
  "fmt"
  "os"

  sepuruxrecorder "github.com/sepurux/go-recorder"
)

func main() {
  client, err := sepuruxrecorder.NewClientFromEnv()
  if err != nil {
    panic(err)
  }

  ctx := context.Background()
  campaignID := os.Getenv("SEPURUX_CAMPAIGN_ID")

  recorder, err := client.Trace(
    ctx,
    "refund_flow",
    map[string]any{"ticketId": "t-123"},
    sepuruxrecorder.TraceOptions{
      CampaignID: campaignID,
      MutationPack: "sepurux.core.reliability",
    },
    func(trace *sepuruxrecorder.ManagedRecorder) error {
      trace.ModelStep("triage_request", map[string]any{"text": "Refund the duplicate charge"}, map[string]any{"action": "refund"})
      trace.ToolCall("payments.refund", map[string]any{"payment_id": "pay_123", "amount": 4200})
      trace.ToolResult("payments.refund", map[string]any{"refund_id": "rf_123", "status": "queued"})
      return nil
    },
  )
  if err != nil {
    panic(err)
  }

  fmt.Println("trace id:", recorder.TraceID)
  fmt.Println("run id:", recorder.RunID)
}`;

  const apiSnippet = `curl -X POST ${apiBaseUrl}/v1/traces \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $SEPURUX_API_KEY" \\
  -H "X-Project-Id: $SEPURUX_PROJECT_ID" \\
  -d '{
    "trace_version": "0.1",
    "source": "docs.quickstart",
    "task": {
      "name": "refund_flow",
      "input": {
        "customer_id": "cus_123"
      }
    },
    "events": [
      {
        "type": "model",
        "name": "triage_refund",
        "input": {
          "order_id": "ord_123"
        }
      }
    ]
  }'`;

  return (
    <div className="min-h-[calc(100vh-5rem)] w-full bg-white text-slate-900">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 text-xs font-medium uppercase tracking-[0.16em] text-slate-500 md:px-8">
        Docs / Common use cases
      </div>

      <div className="w-full lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-slate-50/80 px-6 py-6 lg:min-h-full lg:border-b-0 lg:border-r lg:px-5">
          <div className="lg:sticky lg:top-28">
            <div className="mx-auto max-w-[220px] lg:max-w-none">
              <p className="text-sm font-semibold text-slate-900">Documentation</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Common product workflows for the hosted Sepurux app, API, SDK, and control-plane features.
              </p>

              <nav className="mt-6 space-y-1">
                {useCases.map((useCase) => (
                  <a
                    key={useCase.href}
                    href={useCase.href}
                    className="block rounded-xl px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
                  >
                    {useCase.title}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </aside>

        <article className="px-6 py-8 md:px-10 md:py-10">
          <div className="mx-auto w-full max-w-[1180px]">
            <header className="max-w-4xl">
              <p className="text-sm font-medium text-slate-500">Common use cases</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                Use Sepurux for production reliability workflows.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
                Sepurux captures agent traces, runs deterministic campaigns, injects seeded or custom mutation
                packs, and applies policy or security controls where the membership bundle allows them. Start
                with one of the flows below and follow the corresponding examples.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={referenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
                >
                  Reference docs
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <a
                  href={openApiUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
                >
                  OpenAPI schema
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <Link
                  href="/product"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
                >
                  Product overview
                </Link>
              </div>
            </header>

            <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Use case
                    </th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Recommended workflow
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {useCases.map((useCase) => (
                    <tr key={useCase.href}>
                      <td className="px-5 py-4 align-top">
                        <a href={useCase.href} className="text-sm font-medium text-slate-950 hover:underline">
                          {useCase.title}
                        </a>
                      </td>
                      <td className="px-5 py-4 text-sm leading-7 text-slate-600">{useCase.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-10 space-y-10">
              <DocsSection
                id="sdk"
                title="Capture traces from your application"
                description="The Python SDK is the fastest path from a real agent workflow to a trace in Sepurux. Use a project API key, the project UUID, and the hosted base URL."
              >
                <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-900">Install and environment</p>
                    <div className="mt-4">
                      <CodeBlock code={sdkInstallSnippet} label="bash" />
                    </div>
                    <div className="mt-4">
                      <CodeBlock code={envSnippet} label="env" />
                    </div>
                  </div>
                  <div>
                    <CodeBlock code={sdkSnippet} label="python" />
                  </div>
                </div>
                <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-700">
                    The Python SDK now supports the easy path directly: <code>SepuruxClient.from_env()</code>,{" "}
                    <code>client.trace(...)</code>, and <code>client.traceable(...)</code>. It still exposes the
                    lower-level primitives like <code>upload_trace</code>, <code>create_campaign</code>,{" "}
                    <code>start_run</code>, <code>run_pack</code>, and <code>get_run</code>.
                  </div>
                  <CodeBlock code={traceableSnippet} label="python" />
                </div>
              </DocsSection>

              <DocsSection
                id="campaigns"
                title="Create a campaign and run seeded reliability checks"
                description="Campaigns are project-scoped. Their mutation_set should contain replay mutations only, while pack definitions live in mutation packs and are attached by pack ID or selected at run time."
              >
                <CodeBlock code={campaignSnippet} label="bash" />
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-900">
                  The Campaigns page now exposes the full campaign UUID. Copy that value directly into{" "}
                  <code>SEPURUX_CAMPAIGN_ID</code> or pass it to the SDK. Do not paste mutation-pack definitions
                  into <code>mutation_set</code>.
                </div>
              </DocsSection>

              <DocsSection
                id="mutation-packs"
                title="Create team-specific mutation packs"
                description="Every project is seeded with useful system packs immediately. When the membership bundle allows it, developers and admins can add custom packs that reflect tool-specific schema drift, retry behavior, or prompt injection risks."
              >
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-medium text-slate-900">Seeded system packs</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {seededPacks.map((pack) => (
                      <span
                        key={pack}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700"
                      >
                        {pack}
                      </span>
                    ))}
                  </div>
                </div>
                <CodeBlock code={mutationPackSnippet} label="bash" />
              </DocsSection>

              <DocsSection
                id="clients"
                title="Use TypeScript and Go clients"
                description="Use the recorder helpers as the default integration path for TypeScript and Go. They read the standard Sepurux environment variables, upload traces automatically, and can enqueue campaign runs in the same call. The generated OpenAPI clients still exist for low-level endpoint access."
              >
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-medium text-slate-900">Regenerate clients from OpenAPI</p>
                  <div className="mt-4">
                    <CodeBlock code={clientSnippet} label="bash" />
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-slate-950">TypeScript recorder</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        Use <code>@sepurux/recorder</code> for the easy path. It is the TypeScript equivalent of the
                        Python SDK’s <code>SepuruxClient.from_env()</code> and <code>client.trace(...)</code> flow.
                      </p>
                    </div>
                    <CodeBlock code={typescriptInstallSnippet} label="bash" />
                    <CodeBlock code={typescriptClientSnippet} label="typescript" />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-slate-950">Go recorder</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        Use <code>github.com/sepurux/go-recorder</code> for the default Go path. The generated Go API
                        client remains available for low-level admin or control-plane endpoints when you need raw access.
                      </p>
                    </div>
                    <CodeBlock code={goInstallSnippet} label="bash" />
                    <CodeBlock code={goClientSnippet} label="go" />
                  </div>
                </div>
              </DocsSection>

              <DocsSection
                id="policy-security"
                title="Gate risky workflows with policy and security controls"
                description="Policy packs and tool zoning are control-plane features. They follow RBAC and the membership bundle: viewers are read-only, developers can manage custom mutation packs, and policy/security changes remain admin-managed on plans that expose those sections."
              >
                <CodeBlock code={policySecuritySnippet} label="bash" />
              </DocsSection>

              <DocsSection
                id="api"
                title="Call Sepurux directly over HTTP"
                description="For CI, internal tooling, or custom services, use the hosted API path on the app origin and send X-API-Key and X-Project-Id on every /v1 request."
              >
                <CodeBlock code={apiSnippet} label="bash" />
              </DocsSection>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
