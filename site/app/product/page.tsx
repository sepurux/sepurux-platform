// site/app/product/page.tsx
import type { Metadata } from "next";
import {
  CheckCircle2,
  FlaskConical,
  GitBranch,
  RotateCcw,
  ShieldCheck,
  Workflow,
} from "lucide-react";

import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Product",
  description:
    "Deep dive into Sepurux replay, mutation packs, counterfactuals, policy packs, and CI gate workflows.",
  path: "/product",
});

const modules = [
  {
    title: "Replay",
    icon: RotateCcw,
    eyebrow: "Deterministic replay",
    description:
      "Reconstruct every run step by step, attribute the first failing tool, and keep a faithful timeline of the original incident.",
    bullets: ["Tool call ordering", "Failure reason capture", "Run inspector compatible artifacts"],
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
      "Gate merges and deploys on reliability evidence. Register a scenario pool and every CI run replays all traces — blocked only when the aggregated verdict fails.",
    bullets: ["Batch scenario runs — one job per registered trace", "Scenario coverage enforcement via min_scenarios gate", "GitHub Action integration with aggregated pass/fail"],
    visualTitle: "Batch gate output",
    visualRows: ["scenario_coverage=100%", "pass_rate >= 0.85", "unsafe_runs == 0", "decision=pass"],
  },
];

export default function ProductPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-black">
        <div className="site-container py-16 md:py-24">
          <div className="max-w-4xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">Product</p>
            <h1 className="page-hero-title mt-4 text-white">
              Reliability workflow for production AI agents.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-400">
              Sepurux helps platform teams replay real traces, inject controlled chaos, evaluate outcomes,
              and gate merges when agent quality regresses.
            </p>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-[28px] bg-white/8 md:grid-cols-3">
            {[
              ["Trace-first", "Capture the real execution path before you speculate."],
              ["Failure-aware", "Classify breakpoints and reliability regressions automatically."],
              ["Gate-ready", "Turn evidence into policy and release decisions."],
            ].map(([title, copy]) => (
              <div key={title} className="bg-black px-6 py-7">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-7 text-neutral-400">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Module sections — all dark */}
      {modules.map((module, index) => {
        const Icon = module.icon;
        // Alternate between bg-black and bg-neutral-950 for visual separation
        const bg = index % 2 === 0 ? "bg-black" : "bg-neutral-950";

        return (
          <section key={module.title} className={`${bg} text-white`}>
            <div className="site-container py-16 md:py-24">
              <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
                <div className="max-w-2xl">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                    <Icon className="h-5 w-5" style={{ color: "var(--accent-teal)" }} />
                  </div>
                  <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">
                    {module.eyebrow}
                  </p>
                  <h2 className="section-heading mt-3 text-white">
                    {module.title}
                  </h2>
                  <p className="mt-5 text-lg leading-8 text-neutral-400">
                    {module.description}
                  </p>

                  <ul className="mt-8 space-y-3">
                    {module.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3 text-sm text-neutral-300">
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0"
                          style={{ color: "var(--accent-teal)" }}
                        />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/35">
                        Surface {String(index + 1).padStart(2, "0")}
                      </p>
                      <p className="mt-2 text-lg font-medium text-white">
                        {module.visualTitle}
                      </p>
                    </div>
                    <span className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-white/50">
                      Sepurux
                    </span>
                  </div>

                  <div className="mt-6 space-y-2.5 rounded-[24px] border border-white/8 bg-black/40 p-4">
                    {module.visualRows.map((row, rowIndex) => (
                      <div
                        key={row}
                        className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: rowIndex === module.visualRows.length - 1 ? "var(--accent-teal)" : "rgba(255,255,255,0.2)" }}
                          />
                          <span className="font-mono text-sm text-white/80">{row}</span>
                        </div>
                        <span className="text-xs uppercase tracking-[0.16em] text-white/25">
                          {String(rowIndex + 1).padStart(2, "0")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* System flow */}
      <section className="bg-black text-white">
        <div className="site-container py-16 md:py-24">
          <div className="max-w-4xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">System flow</p>
            <h2 className="section-heading mt-3 text-white">
              Trace to CI decision.
            </h2>
            <p className="mt-5 text-lg leading-8 text-neutral-400">
              Trace intake feeds campaign runs. Worker replays each mutation attempt, policy checks are applied,
              analytics summarize failures, and CI decides pass or fail for release confidence.
            </p>
          </div>

          <div className="mt-10 overflow-x-auto rounded-[32px] border border-white/8 bg-white/[0.03] p-6">
            <div className="min-w-[840px]">
              <div className="grid grid-cols-7 gap-4">
                {["trace", "eval_set", "ci_batch", "attempts", "policy_events", "analytics", "ci_decision"].map((item, index) => (
                  <div key={item} className="rounded-[24px] border border-white/8 bg-black/50 px-4 py-5">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/30">0{index + 1}</p>
                    <p className="mt-2 font-mono text-sm text-white/80">{item}</p>
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
