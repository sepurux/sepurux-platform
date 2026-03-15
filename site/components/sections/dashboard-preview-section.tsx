"use client";

import { motion } from "framer-motion";

export function DashboardPreviewSection() {
  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="site-container">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">
            Visual demo
          </p>
          <h2 className="mt-5 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-slate-950">
            See where your agents break.
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-500">
            Replay incidents, inspect failures, and watch the mutation timeline in a cinematic product view.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-black shadow-[0_40px_100px_rgba(0,0,0,0.18)]"
        >
          <video className="aspect-video h-auto w-full object-cover" autoPlay muted loop playsInline preload="auto">
            <source src="/videos/dashboard-demo.mp4" type="video/mp4" />
          </video>
        </motion.div>
      </div>
    </section>
  );
}
