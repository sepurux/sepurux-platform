import type { Metadata } from "next";

import { DocsCodeBlock, DocsSection, DocsShell } from "@/components/docs/docs-shell";
import { buildPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Getting Started",
  description:
    "Set up Sepurux quickly: environment variables, first trace, and first campaign run for AI reliability validation.",
  path: "/docs/getting-started",
});

const envSnippet = `SEPURUX_API_BASE_URL=${siteConfig.appUrl}/api/backend
SEPURUX_UI_BASE_URL=${siteConfig.appUrl}
SEPURUX_API_KEY=<project_api_key>
SEPURUX_PROJECT_ID=<project_uuid>
SEPURUX_CAMPAIGN_ID=<campaign_uuid>`;

const createTraceSnippet = `curl -X POST ${siteConfig.appUrl}/api/backend/v1/traces \\
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
  }'`;

const basicBuilderSnippet = `# In the app UI:
# 1) Open Mutation Packs -> Create Mutation Pack
# 2) Select Basic Builder and choose a preset + intensity
# 3) Optional: paste trace_id and click "Load Tools"
# 4) Save, then copy mutation_pack_id from the packs table`;

const runWithPackSnippet = `curl -X POST ${siteConfig.appUrl}/api/backend/v1/runs \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $SEPURUX_API_KEY" \\
  -H "X-Project-Id: $SEPURUX_PROJECT_ID" \\
  -d '{
    "trace_id": "<trace_uuid>",
    "campaign_id": "$SEPURUX_CAMPAIGN_ID",
    "mutation_pack_id": "<mutation_pack_uuid>"
  }'`;

export default function GettingStartedPage() {
  return (
    <DocsShell
      kicker="Docs / Getting Started"
      title="Go from zero to your first reliability run."
      description="This guide gets a team from initial setup to a working trace and campaign execution path with production-safe defaults."
      nav={[
        { href: "#prerequisites", label: "Prerequisites" },
        { href: "#environment", label: "Environment Setup" },
        { href: "#first-trace", label: "First Trace" },
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
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-300">{body}</p>
            </div>
          ))}
        </div>
      </DocsSection>

      <DocsSection
        id="environment"
        title="Environment Setup"
        description="Define these variables once in local shell, `.env`, or CI secrets."
      >
        <DocsCodeBlock code={envSnippet} label="env" />
      </DocsSection>

      <DocsSection
        id="first-trace"
        title="Create Your First Trace"
        description="Post a minimal trace payload and confirm it appears in the Sepurux dashboard."
      >
        <DocsCodeBlock code={createTraceSnippet} label="bash" />
      </DocsSection>

      <DocsSection
        id="basic-builder"
        title="Create a Mutation Pack with Basic Builder"
        description="Use the Basic Builder to generate valid mutation packs without hand-writing JSON."
      >
        <DocsCodeBlock code={basicBuilderSnippet} label="steps" />
      </DocsSection>

      <DocsSection
        id="first-run"
        title="Run with Trace + Campaign + Mutation Pack"
        description="Run directly from the Mutation Packs page with Run Now, or use the API endpoint below for automation."
      >
        <DocsCodeBlock code={runWithPackSnippet} label="bash" />
      </DocsSection>
    </DocsShell>
  );
}
