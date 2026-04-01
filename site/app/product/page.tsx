import type { Metadata } from "next";
import { CheckCircle2, FlaskConical, GitBranch, RotateCcw, ShieldCheck, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Product",
  description:
    "Deep dive into Sepurux replay, mutation packs, counterfactuals, policy packs, and CI gate workflows.",
  path: "/product",
});

type Module = {
  title: string;
  icon: LucideIcon;
  eyebrow: string;
  description: string;
  bullets: string[];
  visualTitle: string;
  visualRows: string[];
};

const modules: Module[] = [
  {
    title: "Replay",
    icon: RotateCcw,
    eyebrow: "Deterministic replay",
    description:
      "Reconstruct every run step by step, attribute the first failing tool, and keep a faithful timeline of the original incident.",
    bullets: ["Tool call ordering", "Failure reason capture", "Run inspector artifacts"],
    visualTitle: "Replay timeline",
    visualRows: ["trace.load", "jira.create_issue", "payments.refund", "failure.classify"],
  },
  {
    title: "Mutations",
    icon: FlaskConical,
    eyebrow: "Mutation packs",
    description:
      "Inject schema drift, latency faults, poisoning, and retry pressure into the exact agent path you care about.",
    bullets: ["Weighted mutation packs", "Deterministic seeds", "Per-attempt mutation trace"],
    visualTitle: "Injected variants",
    visualRows: ["drop_field(status)", "timeout(5000ms)", "prompt.inject", "rate_limit(429)"],
  },
  {
    title: "Counterfactuals",
    icon: Workflow,
    eyebrow: "Counterfactual analysis",
    description:
      "Ask what would have happened if you retried, adapted a schema, or changed a policy before you change production systems.",
    bullets: ["Retry policy simulation", "Policy gate alternatives", "Diff snapshots"],
    visualTitle: "What-if variants",
    visualRows: ["retry_backoff -> pass", "schema_adapter -> pass", "no change -> fail", "gate_override -> warn"],
  },
  {
    title: "Policy Packs",
    icon: ShieldCheck,
    eyebrow: "Guardrails",
    description:
      "Model irreversible actions as policy decisions and enforce approval tokens before tools execute.",
    bullets: ["Tool pattern rules", "Approval token checks", "Policy events per run"],
    visualTitle: "Policy response",
    visualRows: ["payments.refund(commit)", "jira.create_issue(commit)", "decision=require_approval", "reason=missing_commit"],
  },
  {
    title: "CI Gate",
    icon: GitBranch,
    eyebrow: "Release control",
    description:
      "Gate merges and deploys on reliability evidence. Register a scenario pool and every CI run replays all traces, blocked only when the aggregated verdict fails.",
    bullets: [
      "Scenario coverage enforcement",
      "Aggregated pass/fail verdict",
      "GitHub Action integration",
    ],
    visualTitle: "Batch gate output",
    visualRows: ["scenario_coverage=100%", "pass_rate >= 0.85", "unsafe_runs == 0", "decision=pass"],
  },
];

const valueCards = [
  ["Trace-first", "Capture the real execution path before you speculate."],
  ["Failure-aware", "Classify breakpoints and reliability regressions automatically."],
  ["Gate-ready", "Turn evidence into policy and release decisions."],
] as const;

const systemFlow = ["trace", "eval_set", "ci_batch", "attempts", "policy_events", "analytics", "ci_decision"];

export default function ProductPage() {
  return (
    <div className="page-shell bg-background">
      <section className="page-hero-shell">
        <div className="site-container relative z-10 py-16 md:py-24">
          <div className="max-w-4xl">
            <p className="section-kicker ink-kicker">Product</p>
            <h1 className="page-hero-title mt-4 text-white">
              Reliability workflow for production AI agents.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              Sepurux helps platform teams record traces, replay real incidents, inject controlled
              chaos, evaluate outcomes, and gate releases before brittle agent behavior becomes a
              production issue.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {valueCards.map(([title, copy]) => (
              <div key={title} className="ink-card-soft rounded-[28px] p-6">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="site-container py-12 md:py-16">
        <div className="space-y-5">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <section key={module.title} className="page-surface p-6 md:p-8">
                <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
                  <div className="max-w-2xl">
                    <div
                      className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border"
                      style={{
                        borderColor: "rgba(var(--accent-rgb), 0.18)",
                        background: "rgba(var(--accent-rgb), 0.08)",
                      }}
                    >
                      <Icon className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
                    </div>
                    <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {module.eyebrow}
                    </p>
                    <h2 className="section-heading mt-3 text-[--text-primary]">{module.title}</h2>
                    <p className="mt-5 text-lg leading-8 text-slate-300">{module.description}</p>

                    <ul className="mt-8 space-y-3">
                      {module.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3 text-sm text-slate-300">
                          <CheckCircle2
                            className="mt-0.5 h-4 w-4 shrink-0"
                            style={{ color: "var(--color-accent)" }}
                          />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-[32px] border border-[--border] bg-[var(--ink-925)] p-6 shadow-[0_24px_64px_rgba(6,8,12,0.18)]">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Surface
                        </p>
                        <p className="mt-2 text-lg font-medium text-white">{module.visualTitle}</p>
                      </div>
                      <span className="metric-chip">Sepurux</span>
                    </div>

                    <div className="mt-6 space-y-2.5 rounded-[24px] border border-white/10 bg-slate-950/80 p-4">
                      {module.visualRows.map((row, rowIndex) => (
                        <div
                          key={row}
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{
                                background:
                                  rowIndex === module.visualRows.length - 1
                                    ? "var(--color-accent)"
                                    : "rgba(148, 163, 184, 0.45)",
                              }}
                            />
                            <span className="font-mono text-sm text-slate-100">{row}</span>
                          </div>
                          <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
                            {String(rowIndex + 1).padStart(2, "0")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <section className="ink-section-muted border-y border-white/10">
        <div className="site-container py-16 md:py-24">
          <div className="max-w-4xl">
            <p className="section-kicker ink-kicker">System flow</p>
            <h2 className="section-heading mt-3 text-white">Trace to CI decision.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Trace intake feeds campaign runs. Worker replays each mutation attempt, policy checks
              are applied, analytics summarize failures, and CI decides pass or fail for release
              confidence.
            </p>
          </div>

          <div className="mt-10 overflow-x-auto rounded-[32px] border border-white/10 bg-white/6 p-6 shadow-[0_24px_60px_rgba(6,8,12,0.18)] backdrop-blur-sm">
            <div className="min-w-[840px]">
              <div className="grid grid-cols-7 gap-4">
                {systemFlow.map((item, index) => (
                  <div key={item} className="rounded-[24px] border border-white/10 bg-black/18 px-4 py-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-2 font-mono text-sm text-slate-100">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
