"use client";

import { motion } from "framer-motion";
import { FlaskConical, GitBranch, GitCompareArrows, History, RotateCcw, ShieldCheck, type LucideIcon } from "lucide-react";

type ModuleCard = {
  title: string;
  eyebrow: string;
  description: string;
  bullets: string[];
  icon: LucideIcon;
};

const modules: ModuleCard[] = [
  {
    title: "Replay",
    eyebrow: "Deterministic incident reconstruction",
    description:
      "Recreate the exact workflow step-by-step so the first issue signal is visible instead of inferred.",
    bullets: ["Prompt and tool ordering", "Failure reason capture", "Timeline artifacts"],
    icon: RotateCcw,
  },
  {
    title: "Saved traces",
    eyebrow: "History when you need it",
    description:
      "Store the useful traces after you’ve seen the answer so you can come back, compare, and share.",
    bullets: ["Persistent trace history", "Shareable results", "Saved analysis context"],
    icon: History,
  },
  {
    title: "Continuous checks",
    eyebrow: "Always-on reliability",
    description:
      "Move stable traces into scheduled checks so regressions show up before the release goes out.",
    bullets: ["Scheduled checks", "CI pre-release tests", "Alertable outcomes"],
    icon: GitBranch,
  },
  {
    title: "Mutation testing",
    eyebrow: "Controlled chaos injection",
    description:
      "Stress the same workflow with schema drift, timeouts, rate limits, and corrupted responses.",
    bullets: ["Weighted fault sets", "Deterministic seeds", "Per-attempt traces"],
    icon: FlaskConical,
  },
  {
    title: "Compare runs",
    eyebrow: "What changed?",
    description:
      "Put the failed run next to the next run and see whether the fix actually improved the path.",
    bullets: ["Side-by-side runs", "Failure drift", "Change validation"],
    icon: GitCompareArrows,
  },
  {
    title: "Policy gates",
    eyebrow: "Guardrails for sensitive paths",
    description:
      "Block risky actions until a policy check says the workflow is safe enough to ship.",
    bullets: ["Approval checks", "Tool zoning", "Release guardrails"],
    icon: ShieldCheck,
  },
];

export function FeatureGrid() {
  return (
    <section className="bg-transparent py-22 sm:py-26">
      <div className="site-container">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-16">
          <div className="max-w-xl">
            <p className="section-kicker">Advanced workflows</p>
            <h2 className="section-heading mt-4 text-[--text-primary]">
              Save replay, mutation testing, and CI for after the debugger tells you where to look.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-300 md:text-lg">
              The first pass is intentionally simple. Once the failure is visible, these are the deeper workflows that keep the same trace useful inside a team process.
            </p>
          </div>

          <div className="space-y-8">
            {modules.map((module, index) => {
              const Icon = module.icon;

              return (
                <motion.article
                  key={module.title}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.42, delay: index * 0.04, ease: "easeOut" }}
                  whileHover={{ y: -3 }}
                  className="grid gap-4 rounded-[28px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.12)] md:grid-cols-[56px_minmax(0,1fr)] md:p-6"
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full border"
                    style={{
                      borderColor: "rgba(var(--accent-rgb), 0.18)",
                      background: "rgba(var(--accent-rgb), 0.08)",
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,0.22fr)]">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {module.eyebrow}
                      </p>
                      <h3 className="mt-3 text-[1.45rem] font-semibold tracking-[-0.04em] text-[--text-primary]">
                        {module.title}
                      </h3>
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                        {module.description}
                      </p>
                    </div>

                    <ul className="space-y-3">
                      {module.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3 text-sm text-slate-300">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
