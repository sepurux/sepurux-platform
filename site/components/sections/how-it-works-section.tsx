"use client";

import { motion } from "framer-motion";

const steps = [
  {
    step: "01",
    title: "Capture a real workflow",
    description:
      "Record what the agent actually did, including prompts, tool calls, outputs, and the final decision path.",
  },
  {
    step: "02",
    title: "Test the same path under failure",
    description:
      "Replay that workflow with failures like timeouts, schema changes, rate limits, and blocked actions to see where it breaks.",
  },
  {
    step: "03",
    title: "Give the team a clear release signal",
    description:
      "Turn the result into a verdict that engineering, product, and security teams can all use before shipping changes.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-transparent py-16 sm:py-20">
      <div className="site-container">
        <div className="section-shell p-6 sm:p-8 lg:p-10">
          <div className="max-w-2xl">
            <p className="section-kicker">How it works</p>
            <h2 className="section-heading mt-4 text-[--text-primary]">
              Trace-first workflow from incident evidence to release gate.
            </h2>
            <p className="section-lead mt-5">
              The flow is short on purpose: capture what actually happened, pressure-test that same
              path, then decide with evidence.
            </p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
            className="mt-9 grid gap-4 md:grid-cols-3"
          >
            {steps.map((step) => (
              <motion.article
                key={step.step}
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.44, ease: "easeOut" } },
                }}
                className="relative rounded-[24px] border border-white/10 bg-white/[0.03] p-5 sm:p-6"
              >
                <div className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                  {step.step}
                </div>
                <h3 className="mt-4 text-[1.35rem] font-semibold tracking-[-0.035em] text-[--text-primary]">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{step.description}</p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
