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
    <section className="bg-transparent py-20 sm:py-24">
      <div className="site-container">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
          <div className="max-w-xl">
            <p className="section-kicker">How it works</p>
            <h2 className="section-heading mt-4 text-[--text-primary]">
              From real agent run to clear go or no-go decision.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-300 md:text-lg">
              Sepurux helps teams understand what an AI workflow did, pressure-test the same path,
              and decide whether that workflow is ready for production.
            </p>

            <p className="mt-6 text-sm leading-7 text-slate-400">
              That makes the product useful to both technical teams who need detailed evidence and
              business stakeholders who need a simple answer about release risk.
            </p>
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
