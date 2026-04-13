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
    "Explore Sepurux end to end: trace debugger, replay, mutation packs, policy packs, CI gating, and enterprise controls.",
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
    title: "Analyze Trace",
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
      "Place the failed run next to the next run and verify whether the fix actually improved the path.",
    bullets: ["Side-by-side deltas", "Regression drift visible", "Shareable evidence"],
    href: "/runs",
    linkLabel: "Compare recent runs",
    icon: GitCompareArrows,
  },
  {
    title: "Mutation Packs",
    eyebrow: "Controlled chaos",
    description:
      "Inject schema drift, latency, and injection faults into the same agent path before release.",
    bullets: ["Weighted scenarios", "Seeded attempts", "Per-run trace output"],
    href: "/mutation-packs",
    linkLabel: "Review mutation packs",
    icon: FlaskConical,
  },
  {
    title: "Policy Packs",
    eyebrow: "Guardrails",
    description:
      "Require approval tokens and unsafe-action checks when the workflow reaches sensitive operations.",
    bullets: ["Approval rules", "Tool zoning", "Audit-friendly events"],
    href: "/policies",
    linkLabel: "Open policy packs",
    icon: ShieldCheck,
  },
  {
    title: "CI Gate",
    eyebrow: "Release control",
    description:
      "Turn trace evidence into a merge or deploy verdict with coverage thresholds and GitHub Actions.",
    bullets: ["Scenario coverage", "Pass-rate thresholds", "Branch protection ready"],
    href: "/docs/ci-cd",
    linkLabel: "Read the CI guide",
    icon: GitBranch,
  },
  {
    title: "Enterprise Controls",
    eyebrow: "Governed scale",
    description:
      "Keep the release process tenant-scoped, reviewable, and ready for security and compliance workflows.",
    bullets: ["Scoped project access", "Audit trails", "Security docs"],
    href: "/docs/policy-security",
    linkLabel: "See governance controls",
    icon: Workflow,
  },
];

const heroRows = [
  {
    title: "Debugger first",
    copy: "Paste a trace and see where it failed or looks risky.",
  },
  {
    title: "Operational next",
    copy: "Replay, compare, and mutate the same path before rollout.",
  },
  {
    title: "Release control",
    copy: "Move the evidence into policy packs and CI checks.",
  },
];

const heroMetrics = [
  { label: "Analysis", value: "Instant", detail: "No sign-in required" },
  { label: "History", value: "Saved later", detail: "When the trace matters" },
  { label: "Gate", value: "CI-ready", detail: "Thresholds and approvals" },
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
                One product from trace analysis to CI gating.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
                Sepurux starts with the debugger: paste a trace, see where it failed or looks risky,
                and move into replay, mutation packs, policy packs, and release gating when you
                need to operationalize the fix.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/sandbox"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.28)] bg-[var(--color-accent)] px-5 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Analyze Trace
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/docs/getting-started"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Read docs
                </Link>
                <Link
                  href="/docs/ci-cd"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Explore CI gate
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                {[
                  "Trace debugger",
                  "Replay",
                  "Compare runs",
                  "Mutation packs",
                  "Policy packs",
                  "CI gating",
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
            Built to start with analysis and end with a release verdict.
          </h2>
          <p className="section-lead mt-5">
            The product is deliberately ordered: debugger first, operational workflows second,
            governance and CI last.
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
              Start with the debugger, then harden the fix into CI.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              Use the sandbox for the first analysis, then move into replay, policy packs, and CI
              gating when you want the answer to stick.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/sandbox"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.28)] bg-[var(--color-accent)] px-5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Analyze Trace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/docs/ci-cd"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 hover:text-white"
              >
                Read CI guide
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
