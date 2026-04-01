"use client";

import { motion } from "framer-motion";

const proofMetrics = [
  ["Replay attempts", "48"],
  ["Unsafe actions", "0"],
  ["Scenario coverage", "100%"],
] as const;

export function DashboardPreviewSection() {
  return (
    <section className="ink-section-muted relative overflow-hidden py-20 sm:py-24">
      <div className="site-container">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:items-end lg:gap-16">
          <div className="max-w-xl">
            <p className="section-kicker ink-kicker">Product proof</p>
            <h2 className="section-heading mt-4 text-white">
              One surface where teams can inspect the trace, the break, and the verdict.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-300 md:text-lg">
              The dashboard is where platform, AI, and security teams meet the same evidence:
              mutation attempts, failure attribution, policy events, and the final release gate.
            </p>

            <div className="mt-8 border-t border-white/10 pt-5">
              <div className="grid gap-4 sm:grid-cols-3">
                {proofMetrics.map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="border-l border-white/10 pl-0 lg:pl-8"
          >
            <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[rgba(7,13,21,0.62)] shadow-[0_32px_80px_rgba(5,10,18,0.3)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Command view
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">
                    Replay, attempts, policy events, and verdicts in one timeline
                  </p>
                </div>
                <span className="metric-chip">run_status=completed</span>
              </div>

              <video
                className="aspect-video h-auto w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster="/images/demo-poster.png"
              >
                <source src="/videos/dashboard-demo.mp4" type="video/mp4" />
              </video>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                first_failure=github.post_comment
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                reason=schema_mismatch
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
