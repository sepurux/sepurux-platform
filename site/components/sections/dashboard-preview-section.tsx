// site/components/sections/dashboard-preview-section.tsx
"use client";

import { motion } from "framer-motion";

export function DashboardPreviewSection() {
  return (
    <section className="ink-section relative overflow-hidden py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_60%)]" />
      <div className="site-container">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="section-kicker ink-kicker">
            Visual demo
          </p>
          <h2
            className="mt-5 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]"
            style={{ color: "#F8FAFC" }}
          >
            See where your agents break.
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-300">
            Replay incidents, inspect failures, and watch the mutation timeline in a cinematic product view.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-white/10 bg-slate-950"
          style={{ boxShadow: "0 0 0 1px rgba(var(--accent-rgb), 0.16), 0 28px 80px rgba(0,0,0,0.36)" }}
        >
          <video
            className="aspect-video h-auto w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/images/demo-poster.png"
          >
            <source src="/videos/dashboard-demo.mp4" type="video/mp4" />
          </video>
        </motion.div>
      </div>
    </section>
  );
}
