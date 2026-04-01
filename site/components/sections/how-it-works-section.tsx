"use client";

import { motion } from "framer-motion";

const steps = [
  {
    step: "01",
    title: "Capture the real execution path",
    description:
      "Instrument the agent once and keep the prompts, tool calls, arguments, outputs, and run metadata that actually matter.",
  },
  {
    step: "02",
    title: "Replay under controlled degradation",
    description:
      "Inject schema drift, timeouts, rate limits, and value corruption into the exact path that failed or the workflow you need confidence in.",
  },
  {
    step: "03",
    title: "Enforce policy and safety rules",
    description:
      "Require approval tokens, block unsafe tool paths, and surface violations before sensitive actions leave the sandbox.",
  },
  {
    step: "04",
    title: "Ship a CI verdict teams can trust",
    description:
      "Aggregate pass rate, scenario coverage, unsafe attempts, and reliability evidence into a gate that can block risky merges.",
  },
];

const artifacts = [
  "trace.timeline.json",
  "mutation_trace.json",
  "policy_events.log",
  "ci_decision=pass|fail",
];

export function HowItWorksSection() {
  return (
    <section className="bg-transparent py-20 sm:py-24">
      <div className="site-container">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
          <div className="max-w-xl">
            <p className="section-kicker">Operator workflow</p>
            <h2 className="section-heading mt-4 text-[--text-primary]">
              A reliability loop built around evidence, not assumptions.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-300 md:text-lg">
              Sepurux is strongest when it behaves like platform infrastructure. The system records
              what happened, stresses the same workflow, and turns the outcome into a release
              decision.
            </p>

            <div className="mt-8 border-t border-[--border] pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Artifacts teams keep
              </p>
              <div className="mt-4 space-y-3">
                {artifacts.map((artifact) => (
                  <div key={artifact} className="flex items-center justify-between border-b border-[--border] pb-3">
                    <span className="font-mono text-sm text-[--text-primary]">{artifact}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      output
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
            className="border-l border-[--border] pl-0 md:pl-8"
          >
            <div className="space-y-8">
              {steps.map((step) => (
                <motion.div
                  key={step.step}
                  variants={{
                    hidden: { opacity: 0, y: 22 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
                  }}
                  className="grid gap-4 border-b border-[--border] pb-8 md:grid-cols-[84px_minmax(0,1fr)]"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {step.step}
                  </div>
                  <div>
                    <h3 className="text-[1.45rem] font-semibold tracking-[-0.04em] text-[--text-primary]">
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
