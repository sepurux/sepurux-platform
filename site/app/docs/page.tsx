import type { Metadata } from "next";
import Link from "next/link";

import { DocsCard, DocsCodeBlock, DocsSection, DocsShell } from "@/components/docs/docs-shell";
import { buildPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Docs",
  description:
    "Professional Sepurux documentation for setup, SDKs, CI/CD gates, policy controls, security guardrails, and API usage.",
  path: "/docs",
});

const docTracks = [
  {
    title: "Getting Started",
    description:
      "Set up environment variables, capture a trace, build a mutation pack in Basic Builder, and run checks in minutes.",
    href: "/docs/getting-started",
  },
  {
    title: "CI/CD Gate",
    description: "Add Sepurux to GitHub workflows and block risky releases when thresholds fail.",
    href: "/docs/ci-cd",
  },
  {
    title: "Policy & Security",
    description: "Configure policy packs, approval rules, and tool zoning for sensitive actions.",
    href: "/docs/policy-security",
  },
  {
    title: "API Reference Guide",
    description: "See base URL, required headers, core endpoints, and practical request examples.",
    href: "/docs/api-reference",
  },
  {
    title: "Integrations",
    description: "Drop-in OpenAI and LangChain integrations that record traces without manual instrumentation.",
    href: "/docs/integrations",
  },
  {
    title: "Webhooks",
    description: "Receive signed HTTP notifications for run.completed, trace.created, ci.decision, and more.",
    href: "/docs/webhooks",
  },
  {
    title: "FAQ & Support",
    description: "Find quick answers and the right channel for product, integration, and onboarding questions.",
    href: "/docs/faq",
  },
  {
    title: "Product Overview",
    description: "Understand how replay, mutation packs, policy gates, and CI decisions fit together.",
    href: "/product",
  },
];

const quickstartSnippet = `SEPURUX_API_BASE_URL=${siteConfig.appUrl}/api/backend
SEPURUX_UI_BASE_URL=${siteConfig.appUrl}
SEPURUX_API_KEY=<project_api_key>
SEPURUX_PROJECT_ID=<project_uuid>`;

const firstCallSnippet = `curl -X POST ${siteConfig.appUrl}/api/backend/v1/traces \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $SEPURUX_API_KEY" \\
  -H "X-Project-Id: $SEPURUX_PROJECT_ID" \\
  -d '{
    "trace_version": "0.1",
    "source": "docs.quickstart",
    "task": {"name": "refund_flow"},
    "events": [
      {"type": "model", "name": "triage_refund", "input": {"order_id": "ord_123"}}
    ]
  }'`;

export default function DocsPage() {
  return (
    <DocsShell
      kicker="Documentation"
      title="Operational docs for teams shipping reliable AI agents."
      description="Use the docs the same way you use the product: start from a real workflow, connect a project, capture a trace, and move into replay, policy, and CI control."
      nav={[
        { href: "#start", label: "Start Here" },
        { href: "#tracks", label: "Documentation Tracks" },
        { href: "#resources", label: "Reference Resources" },
      ]}
      actions={[
        { href: "/docs/getting-started", label: "Open quickstart" },
        { href: "/docs/api-reference", label: "API reference" },
        { href: "/docs/ci-cd", label: "CI guide" },
      ]}
    >
      <DocsSection
        id="start"
        title="Start Here"
        description="Validate the full setup path in three steps before diving deeper into CI, policy, and enterprise controls."
      >
        <div className="space-y-5">
          {[
            ["1. Connect a project", "Generate a project API key and copy your project UUID from the app workspace."],
            ["2. Set the environment", "Define the base URLs and auth variables once in your shell or CI secrets."],
            ["3. Capture, build, run", "Record a trace, create a mutation pack, and execute the first reliability run."],
          ].map(([title, body]) => (
            <div key={title} className="grid gap-3 border-t border-[--border] pt-4 md:grid-cols-[180px_minmax(0,1fr)]">
              <p className="text-sm font-semibold text-[--text-primary]">{title}</p>
              <p className="text-sm leading-7 text-slate-300">{body}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <DocsCodeBlock code={quickstartSnippet} label="env" />
          <DocsCodeBlock code={firstCallSnippet} label="bash" />
        </div>
      </DocsSection>

      <DocsSection
        id="tracks"
        title="Documentation Tracks"
        description="Choose the guide that matches your role and the part of the rollout you are working on."
      >
        <div className="divide-y divide-[--border]">
          {docTracks.map((track) => (
            <DocsCard key={track.href} href={track.href} title={track.title} description={track.description} />
          ))}
        </div>
      </DocsSection>

      <DocsSection
        id="resources"
        title="Reference Resources"
        description="Direct links for implementation detail, rollout support, and the public integration surface."
      >
        <div className="space-y-5">
          <Link
            href="/docs/api-reference"
            className="flex items-start justify-between gap-6 border-t border-[--border] py-5 transition-colors hover:text-[--color-accent]"
          >
            <div>
              <p className="text-base font-semibold text-[--text-primary]">API Reference Guide</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Public request examples, headers, and the core endpoints most teams need to wire traces, runs, and CI.
              </p>
            </div>
            <span className="text-sm text-slate-400">Guide</span>
          </Link>

          <div className="flex items-start justify-between gap-6 border-t border-[--border] py-5">
            <div>
              <p className="text-base font-semibold text-[--text-primary]">Full Explorer Access</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                The full interactive explorer and raw OpenAPI schema live inside the authenticated product workspace so project-scoped and administrative routes stay protected.
              </p>
            </div>
            <span className="text-sm text-slate-400">In-app</span>
          </div>

          <div className="border-t border-[--border] py-5 text-sm leading-7 text-slate-300">
            Need help designing a rollout path for your team? Visit{" "}
            <Link href="/waitlist" className="text-[--text-primary] underline underline-offset-4">
              Join the waitlist
            </Link>{" "}
            or email{" "}
            <a href={`mailto:${siteConfig.supportEmail}`} className="text-[--text-primary] underline underline-offset-4">
              {siteConfig.supportEmail}
            </a>
            .
          </div>
        </div>
      </DocsSection>
    </DocsShell>
  );
}
