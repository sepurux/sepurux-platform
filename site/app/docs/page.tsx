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
    recommendation: "Generated TypeScript and Go clients from the hosted OpenAPI schema",
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
from sepurux import SepuruxClient, sepurux_trace

with SepuruxClient(
    base_url="${apiBaseUrl}",
    api_key=os.environ["SEPURUX_API_KEY"],
    project_id=os.environ["SEPURUX_PROJECT_ID"],
) as client:
    with sepurux_trace("refund_flow", {"channel": "support"}) as recorder:
        recorder.model_step(
            "triage_request",
            {"text": "Refund the duplicate charge"},
            output={"action": "refund", "risk": "medium"},
        )
        recorder.tool_call(
            "payments.refund",
            {"payment_id": "pay_123", "amount": 4200},
        )
        recorder.tool_result(
            "payments.refund",
            {"refund_id": "rf_123", "status": "queued"},
        )

    trace_id = client.upload_trace(recorder.to_trace())
    print(trace_id)`;

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

# TypeScript and Go clients in this repo are generated from the same schema.
make gen-clients`;

  const typescriptInstallSnippet = `cd clients/typescript
npm install
npm run build`;

  const typescriptClientSnippet = `import { Configuration, RunsApi, TracesApi } from "@sepurux/client";

const config = new Configuration({
  basePath: "${apiBaseUrl}",
  headers: {
    "X-API-Key": process.env.SEPURUX_API_KEY ?? "",
    "X-Project-Id": process.env.SEPURUX_PROJECT_ID ?? "",
  },
});

const tracesApi = new TracesApi(config);
const trace = await tracesApi.postTraceV1TracesPost({
  body: {
    trace_version: "0.1",
    source: "typescript-client",
    task: { name: "demo-task", input: { prompt: "hello" } },
    events: [{ type: "model_step", name: "assistant", output: { text: "hi" } }],
  },
});

const runsApi = new RunsApi(config);
const run = await runsApi.postRunV1RunsPost({
  runCreateRequest: {
    trace_id: trace.trace_id,
    campaign_id: process.env.SEPURUX_CAMPAIGN_ID ?? "",
  },
});

console.log(run.run_id);`;

  const goInstallSnippet = `cd clients/go
go build ./...`;

  const goClientSnippet = `package main

import (
  "context"
  "fmt"
  "os"

  sepuruxclient "github.com/sepurux/go-sdk"
)

func main() {
  cfg := sepuruxclient.NewConfiguration()
  cfg.Servers = sepuruxclient.ServerConfigurations{{URL: "${apiBaseUrl}"}}
  cfg.AddDefaultHeader("X-API-Key", os.Getenv("SEPURUX_API_KEY"))

  client := sepuruxclient.NewAPIClient(cfg)
  ctx := context.Background()
  projectID := os.Getenv("SEPURUX_PROJECT_ID")
  campaignID := os.Getenv("SEPURUX_CAMPAIGN_ID")

  traceBody := map[string]interface{}{
    "trace_version": "0.1",
    "source": "go-client",
    "task": map[string]interface{}{"name": "demo-task", "input": map[string]interface{}{"prompt": "hello"}},
    "events": []map[string]interface{}{{"type": "model_step", "name": "assistant"}},
  }

  trace, _, err := client.TracesAPI.PostTraceV1TracesPost(ctx).Body(traceBody).XProjectId(projectID).Execute()
  if err != nil {
    panic(err)
  }

  runReq := sepuruxclient.NewRunCreateRequest(trace.GetTraceId(), campaignID)
  run, _, err := client.RunsAPI.PostRunV1RunsPost(ctx).RunCreateRequest(*runReq).XProjectId(projectID).Execute()
  if err != nil {
    panic(err)
  }

  fmt.Println("run id:", run.GetRunId())
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
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-700">
                  The Python SDK exposes higher-level helpers like <code>upload_trace</code>,{" "}
                  <code>create_campaign</code>, <code>start_run</code>, <code>run_pack</code>, and{" "}
                  <code>get_run</code>. It also sends the <code>X-Sepurux-SDK</code> header automatically.
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
                description="The hosted OpenAPI document is the source of truth for generated TypeScript and Go clients. The repository already checks in generated clients, and you can regenerate them whenever the API surface changes."
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
                      <h3 className="text-lg font-medium text-slate-950">TypeScript client</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        The generated TypeScript package uses the name <code>@sepurux/client</code> and is built
                        from the <code>typescript-fetch</code> generator.
                      </p>
                    </div>
                    <CodeBlock code={typescriptInstallSnippet} label="bash" />
                    <CodeBlock code={typescriptClientSnippet} label="typescript" />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-slate-950">Go client</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        The generated Go module in this repository uses the module path{" "}
                        <code>github.com/sepurux/go-sdk</code>.
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
