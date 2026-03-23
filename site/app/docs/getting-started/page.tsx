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

const runCampaignSnippet = `curl -X POST ${siteConfig.appUrl}/api/backend/v1/campaigns/$SEPURUX_CAMPAIGN_ID/run-pack \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $SEPURUX_API_KEY" \\
  -H "X-Project-Id: $SEPURUX_PROJECT_ID" \\
  -d '{
    "pack": "sepurux.core.reliability"
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
        { href: "#first-run", label: "First Campaign Run" },
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
        id="first-run"
        title="Run a Seeded Reliability Pack"
        description="Execute a baseline mutation pack to validate your integration before custom packs or policy tuning."
      >
        <DocsCodeBlock code={runCampaignSnippet} label="bash" />
      </DocsSection>
    </DocsShell>
  );
}
