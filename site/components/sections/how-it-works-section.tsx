// site/components/sections/how-it-works-section.tsx
"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    title: "Capture a real trace",
    description:
      "Record production-like workflows with real tool calls so tests run against behavior that actually matters.",
  },
  {
    title: "Apply a mutation pack",
    description:
      "Inject schema drift, timeouts, and tool faults to expose brittle logic before users hit it in production.",
  },
  {
    title: "Gate release in CI",
    description:
      "Run the reliability gate in pull requests and block deploys when pass rate, safety, or score thresholds fail.",
  },
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
            Capture, mutate, and gate in three steps.
          </h2>
          <p className="mt-4 text-base leading-8 text-neutral-400">
            A clean flow your engineering team can adopt without changing your whole stack.
          </p>
        </div>

        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            variants={containerVariants}
            className="grid gap-4 lg:grid-cols-3"
          >
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                variants={itemVariants}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-300 hover:border-[rgba(0,229,204,0.28)] hover:bg-white/[0.05]"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold tabular-nums"
                    style={{
                      borderColor: "rgba(0,229,204,0.35)",
                      background: "rgba(0,229,204,0.08)",
                      color: "var(--accent-teal)",
                    }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  {index < steps.length - 1 ? (
                    <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-[var(--accent-teal)]" />
                  ) : null}
                </div>

                <h3 className="font-display text-xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-neutral-300">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
