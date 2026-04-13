"use client";

import { motion } from "framer-motion";
import { ArrowRight, FileText, GitCompareArrows, Search } from "lucide-react";

const steps = [
  {
    step: "01",
    title: "Paste the trace",
    description:
      "Drop in JSON, logs, or semi-structured output. The debugger tries structured parsing first and still handles raw text.",
    icon: FileText,
  },
  {
    step: "02",
    title: "See what looks risky",
    description:
      "The result points to the issue step, the first signal, and the evidence that led to the call.",
    icon: Search,
  },
  {
    step: "03",
    title: "Fix it fast",
    description:
      "Use the suggested fix, save the trace, or compare it against the next run when you need a second pass.",
    icon: GitCompareArrows,
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-transparent py-18 sm:py-22">
      <div className="site-container">
        <div className="section-shell p-6 sm:p-8 lg:p-10">
          <div className="max-w-2xl">
            <p className="section-kicker">How it works</p>
            <h2 className="section-heading mt-4 text-[--text-primary]">
              Paste, analyze, fix.
            </h2>
            <p className="section-lead mt-5">
              The flow stays short on purpose: paste the trace, locate the issue, and move on with a fix you can verify.
            </p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
            className="mt-9 grid gap-4 md:grid-cols-3"
          >
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <motion.article
                  key={step.step}
                  variants={{
                    hidden: { opacity: 0, y: 18 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.44, ease: "easeOut" } },
                  }}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="relative overflow-hidden rounded-[26px] border border-white/8 bg-white/[0.035] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.14)] sm:p-6"
                >
                  <div className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-white/10 bg-white/8 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                    {step.step}
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-primary">
                    <Icon className="h-4 w-4" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Step
                    </span>
                  </div>
                  <h3 className="mt-3 text-[1.35rem] font-semibold tracking-[-0.035em] text-[--text-primary]">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{step.description}</p>
                </motion.article>
              );
            })}
          </motion.div>

          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <ArrowRight className="h-4 w-4 text-primary" />
            <p>Advanced replay, mutation testing, and CI gates stay lower on the page for later.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
