"use client";

import { motion } from "framer-motion";
import { MonitorPlay } from "lucide-react";

export function DashboardPreviewSection() {
  return (
    <section className="mt-24 bg-white py-20 text-black sm:mt-28 sm:py-24">
      <div className="site-container">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
            <MonitorPlay className="h-4 w-4 text-blue-600" />
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-600">Visual demo</p>
          </div>
          <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            See where your agents break.
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-600">
            Replay incidents, inspect failures, and watch the mutation timeline in a cinematic product view.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-slate-200 bg-black shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
        >
          <video className="aspect-video h-auto w-full object-cover" autoPlay muted loop playsInline preload="auto">
            <source src="/videos/dashboard-demo.mp4" type="video/mp4" />
          </video>
        </motion.div>

        <p className="mx-auto mt-6 max-w-3xl text-center text-base leading-8 text-slate-600">
          Product video: timeline, mutation playback, failure report, and reliability score in one view.
        </p>
      </div>
    </section>
  );
}
