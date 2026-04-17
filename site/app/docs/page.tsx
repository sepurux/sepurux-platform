import type { Metadata } from "next";
import Link from "next/link";

import { DocsCard, DocsCodeBlock, DocsSection, DocsShell } from "@/components/docs/docs-shell";
import { buildPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Docs",
  description:
    "Sepurux docs for the full loop: debug in browser, install the recorder, capture traces automatically, and gate releases in CI.",
  path: "/docs",
});

const docTracks = [
  {
    title: "Getting Started",
    description:
      "Debug a trace first, install the recorder for your stack, capture traces automatically, and run checks in minutes.",
    href: "/docs/getting-started",
  },
  {
    title: "CI/CD Gate",
    description: "Turn reliability findings into release gates in GitHub workflows.",
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
    description: "Understand how the debugger, replay, mutation packs, policy packs, and CI decisions fit together.",
    href: "/product",
  },
];

const quickstartSnippet = `# Install the recorder for your stack
pip install sepurux
npm install @sepurux/recorder
go get github.com/sepurux/go-recorder@latest

SEPURUX_API_BASE_URL=${siteConfig.appUrl}/api/backend
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
      title="Debug in the browser. Record in code. Gate in CI."
      description="Use the docs as one loop: debug a trace in the browser, install the recorder in code, capture traces automatically, then turn findings into CI release gates."
      nav={[
        { href: "#start", label: "Start Here" },
        { href: "#tracks", label: "Documentation Tracks" },
        { href: "#resources", label: "Reference Resources" },
      ]}
      actions={[
        { href: "/sandbox", label: "Debug a trace" },
        { href: "/docs/getting-started", label: "Install the recorder" },
        { href: "/docs/ci-cd", label: "Gate in CI" },
      ]}
    >
      <DocsSection
        id="start"
        title="Start Here"
        description="Run the full adoption path in three steps before diving deeper into policy and enterprise controls."
      >
        <div className="space-y-5">
          {[
            ["1. Debug in browser", "Start with a real failing trace in the debugger and confirm the failing step plus next fix."],
            ["2. Install the recorder", "Use pip, npm, or go get once, then capture traces automatically from real code paths."],
            ["3. Gate in CI", "Promote stable traces into CI checks so reliability failures block risky releases."],
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
