import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  FileSearch,
  FlaskConical,
  GitBranch,
  GitCompareArrows,
  RotateCcw,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { buildPageMetadata } from "@/lib/site";
import { CIGateSection } from "@/components/sections/ci-gate-section";
import { EnterpriseReadinessSection } from "@/components/sections/enterprise-readiness-section";
import { FaqSection } from "@/components/sections/faq-section";
import { IncidentProofSection } from "@/components/sections/incident-proof-section";
import { IntegrationSection } from "@/components/sections/integration-section";
import { ScreenshotGallerySection } from "@/components/sections/screenshot-gallery-section";

export const metadata: Metadata = buildPageMetadata({
  title: "Product",
  description:
    "Explore the Sepurux loop end to end: debug in browser, record in code, and gate in CI.",
  path: "/product",
});

type Capability = {
  title: string;
  eyebrow: string;
  description: string;
  bullets: string[];
  href: string;
  linkLabel: string;
  icon: LucideIcon;
};

const capabilities: Capability[] = [
  {
    title: "Trace Debugger",
    eyebrow: "Immediate debugger",
    description:
      "Paste JSON, logs, or raw text and isolate the failure location, likely cause, and next fix before sign-in.",
    bullets: ["Structured parsing first", "Raw text fallback", "Trace IDs hydrate history"],
    href: "/sandbox",
    linkLabel: "Open the debugger",
    icon: FileSearch,
  },
  {
    title: "Replay",
    eyebrow: "Deterministic review",
    description:
      "Re-run the same trace step by step so the fix can be compared against a faithful timeline.",
    bullets: ["Tool order preserved", "Failure reason captured", "Compare with the next run"],
    href: "/runs",
    linkLabel: "See replay history",
    icon: RotateCcw,
  },
  {
    title: "Compare Runs",
    eyebrow: "Change validation",
    description:
      "Place the failed run next to the fixed run and verify whether the change actually improved the path.",
    bullets: ["Side-by-side deltas", "Regression drift visible", "Shareable evidence"],
    href: "/runs",
    linkLabel: "Compare recent runs",
    icon: GitCompareArrows,
  },
  {
    title: "Stress Tests",
    eyebrow: "Find what breaks",
    description:
      "Inject timeouts, schema breaks, and rate limits into a passing trace to find failures before release.",
    bullets: ["Weighted scenarios", "Seeded attempts", "Per-run trace output"],
    href: "/mutation-packs",
    linkLabel: "Run a stress test",
    icon: FlaskConical,
  },
  {
    title: "Policy Controls",
    eyebrow: "Guardrails",
    description:
      "Set limits on which tools your agent can call. Require approval before sensitive operations go through.",
    bullets: ["Approval rules", "Tool zoning", "Audit-friendly events"],
    href: "/policies",
    linkLabel: "Configure policies",
    icon: ShieldCheck,
  },
  {
    title: "CI Integration",
    eyebrow: "Block on failure",
    description:
      "Block merges and deploys when trace checks fail below your pass threshold. Integrates with GitHub Actions.",
    bullets: ["Scenario coverage", "Pass-rate thresholds", "Branch protection ready"],
    href: "/docs/ci-cd",
    linkLabel: "Read the CI guide",
    icon: GitBranch,
  },
  {
    title: "Team Controls",
    eyebrow: "Governed scale",
    description:
      "Keep your agent workflows reviewable and ready for security and compliance requirements as your team grows.",
    bullets: ["Scoped project access", "Audit trails", "Security docs"],
    href: "/docs/policy-security",
    linkLabel: "See team controls",
    icon: Workflow,
  },
];

const heroRows = [
  {
    title: "Debug in the browser",
    copy: "Paste a trace and see where it failed or looks risky.",
  },
  {
    title: "Record in code",
    copy: "Install the recorder to capture traces automatically from real workflows.",
  },
  {
    title: "Gate in CI",
    copy: "Turn reliability findings into release gates that block regressions automatically.",
  },
];

const heroMetrics = [
  { label: "Analysis", value: "Instant", detail: "No sign-in required" },
  { label: "History", value: "Saved later", detail: "When the trace matters" },
  { label: "CI", value: "CI-ready", detail: "Block on pass rate" },
];

function CapabilityCard({
  title,
  eyebrow,
  description,
  bullets,
  href,
  linkLabel,
  icon: Icon,
}: Capability) {
  return (
    <Link
      href={href}
      className="group page-surface flex h-full flex-col justify-between p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/12 hover:bg-[rgba(255,255,255,0.04)]"
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-[var(--color-accent)] shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
            <Icon className="h-5 w-5" />
          </span>
          <ArrowRight className="mt-1 h-4 w-4 text-slate-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white" />
        </div>

        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {eyebrow}
        </p>
        <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[--text-primary]">
          {title}
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-300">{description}</p>

        <ul className="mt-5 space-y-3">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-3 text-sm leading-6 text-slate-300">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-sm font-medium text-white/80">{linkLabel}</p>
    </Link>
  );
}

function MetricTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="page-surface-muted p-4 transition-transform duration-200 hover:-translate-y-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[--text-primary]">
        {value}
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-300">{detail}</p>
    </div>
  );
}

function HeroPanel() {
  return (
    <div className="grid gap-4">
      <div className="page-surface p-6 sm:p-7">
        <p className="section-kicker">What ships</p>
        <div className="mt-4 space-y-3">
          {heroRows.map((row) => (
            <div
              key={row.title}
              className="page-surface-muted px-4 py-4 transition-transform duration-200 hover:-translate-y-0.5"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {row.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{row.copy}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {heroMetrics.map((metric) => (
          <MetricTile key={metric.label} {...metric} />
        ))}
      </div>
    </div>
  );
}

export default function ProductPage() {
  return (
    <div className="page-shell bg-background">
      <section className="page-hero-shell">
        <div className="site-container relative z-10 py-16 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-center">
            <div className="max-w-3xl">
              <p className="section-kicker ink-kicker">Product</p>
              <h1 className="page-hero-title mt-4 text-white">
                Debug fast. Everything else follows when you need it.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
                Debug in the browser first, then install the recorder to capture traces in code,
                and gate releases in CI when the workflow is stable. No account required to start.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/sandbox"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.28)] bg-[var(--color-accent)] px-5 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Debug a trace
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/docs/getting-started"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Install the recorder
                </Link>
                <Link
                  href="/docs/ci-cd"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Gate in CI
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                {[
                  "Trace debugger",
                  "Replay",
                  "Compare runs",
                  "Stress tests",
                  "Policy controls",
                  "CI integration",
                ].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <HeroPanel />
          </div>
        </div>
      </section>

      <section className="site-container py-12 md:py-16">
        <div className="max-w-3xl">
          <p className="section-kicker">Platform surfaces</p>
          <h2 className="section-heading mt-3 text-[--text-primary]">
            Starts with a trace. Goes as far as you need.
          </h2>
          <p className="section-lead mt-5">
            Debug in the browser, record in code, then gate in CI.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {capabilities.map((capability) => (
            <CapabilityCard key={capability.title} {...capability} />
          ))}
        </div>
      </section>

      <IncidentProofSection />
      <ScreenshotGallerySection />
      <IntegrationSection />
      <CIGateSection />
      <EnterpriseReadinessSection />

      <section className="ink-section relative overflow-hidden py-24 sm:py-28">
        <div className="site-container relative z-10">
          <div className="mx-auto max-w-4xl rounded-[32px] border border-white/10 bg-white/[0.03] p-7 shadow-[0_24px_72px_rgba(0,0,0,0.24)] md:p-10">
            <p className="section-kicker ink-kicker">Ready when you are</p>
            <h2 className="section-heading mt-4 text-white">
              Start with the trace. Go further when you're ready.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              Use the sandbox for the first analysis, install the recorder for continuous capture,
              then move into replay, stress testing, and CI gates when you want the fix to hold.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/sandbox"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.28)] bg-[var(--color-accent)] px-5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Debug a trace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/docs/ci-cd"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 hover:text-white"
              >
                Gate in CI
              </Link>
              <Link
                href="/docs/getting-started"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 hover:text-white"
              >
                Install the recorder
              </Link>
              <Link
                href="/waitlist"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 hover:text-white"
              >
                Request access
              </Link>
            </div>
          </div>
        </div>
      </section>

      <FaqSection />
    </div>
  );
}
