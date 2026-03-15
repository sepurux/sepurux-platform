// site/components/sections/how-it-works-section.tsx
"use client";

import { motion } from "framer-motion";

const steps = [
  { title: "Prompt", description: "Capture the agent task and real execution context." },
  { title: "Agent Execution", description: "Replay the exact tool sequence step by step." },
  { title: "Mutation Injection", description: "Inject failures and drift into the same workflow." },
  { title: "Failure Detection", description: "Classify the break point and why it failed." },
  { title: "Reliability Score", description: "Summarize the run into a score your team can act on." },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

export function HowItWorksSection() {
  return (
    <section className="bg-black py-24 sm:py-32">
      <div className="site-container">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">How it works</p>
          <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
            From trace capture to reliability score in five steps.
          </h2>
          <p className="mt-4 text-base leading-8 text-neutral-400">
            A simple, visible workflow from trace capture to reliability decision.
          </p>
        </div>

        <div className="mx-auto max-w-2xl">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            variants={containerVariants}
            className="relative"
          >
            {/* vertical teal connecting line */}
            <div
              className="absolute left-[13px] top-10 -bottom-2 w-px"
              style={{ background: "linear-gradient(to bottom, rgba(0,229,204,0.5), rgba(0,229,204,0.05))" }}
            />

            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                variants={itemVariants}
                className="relative flex gap-8 py-8"
              >
                {/* step number with teal accent */}
                <div className="relative z-10 shrink-0">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold tabular-nums"
                    style={{
                      borderColor: "rgba(0,229,204,0.35)",
                      background: "rgba(0,229,204,0.08)",
                      color: "var(--accent-teal)",
                    }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </div>
                </div>

                <div className="border-b border-white/8 pb-8 last:border-0 flex-1">
                  <h3 className="font-display text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-base leading-7 text-neutral-400">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
