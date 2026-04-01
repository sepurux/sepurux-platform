"use client";

import { motion } from "framer-motion";
import {
  FlaskConical,
  GitBranch,
  RotateCcw,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from "lucide-react";

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
      "Recreate the original agent path, step-by-step, until the first failure becomes visible and attributable.",
    bullets: ["Prompt and tool ordering", "Failure reason capture", "Timeline artifacts"],
    icon: RotateCcw,
  },
  {
    title: "Mutation Packs",
    eyebrow: "Controlled chaos injection",
    description:
      "Stress the same workflow with schema drift, timeouts, rate limits, and corrupted responses instead of guessing where it is brittle.",
    bullets: ["Weighted fault sets", "Deterministic seeds", "Per-attempt traces"],
    icon: FlaskConical,
  },
  {
    title: "Policy + Security",
    eyebrow: "Guardrails for irreversible actions",
    description:
      "Require approvals, block unsafe tool paths, and add security checks before sensitive actions leave the agent sandbox.",
    bullets: ["Approval tokens", "Tool zoning", "Unsafe event visibility"],
    icon: ShieldCheck,
  },
  {
    title: "Counterfactuals",
    eyebrow: "What-if analysis before rollout",
    description:
      "Model alternate retries, policy decisions, and schema adapters before production changes are made permanent.",
    bullets: ["Retry simulations", "Diff snapshots", "Operator review loops"],
    icon: Workflow,
  },
  {
    title: "CI Gate",
    eyebrow: "Release control from evidence",
    description:
      "Register the scenario pool once, then let CI decide whether the reliability bar held on every new change set.",
    bullets: ["Scenario coverage", "Aggregated pass/fail", "Branch protection ready"],
    icon: GitBranch,
  },
];

export function FeatureGrid() {
  return (
    <section className="bg-transparent py-20 sm:py-24">
      <div className="site-container">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.74fr)_minmax(0,1.26fr)] lg:gap-16">
          <div className="max-w-xl">
            <p className="section-kicker">Platform surfaces</p>
            <h2 className="section-heading mt-4 text-[--text-primary]">
              The product is organized around operational modules, not feature-soup marketing.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-300 md:text-lg">
              Each surface maps to a real reliability task: record the trace, replay it under
              fault, enforce safety rules, compare alternatives, then ship a decision.
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
                  className="grid gap-4 border-t border-[--border] pt-6 md:grid-cols-[56px_minmax(0,1fr)]"
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
