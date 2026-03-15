"use client";

import { motion } from "framer-motion";

export function DashboardPreviewSection() {
  return (
    <section className="site-container mt-24 sm:mt-28">
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="section-kicker">Visual demo</p>
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white md:text-5xl">
          See where your agents break.
        </h2>
        <p className="mt-4 text-base leading-8 text-neutral-500">
          Replay incidents, inspect failures, and watch the mutation timeline in a cinematic product view.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="mx-auto max-w-6xl overflow-hidden rounded-xl border border-neutral-900 bg-black"
      >
        <video className="aspect-video h-auto w-full object-cover" autoPlay muted loop playsInline preload="auto">
          <source src="/videos/dashboard-demo.mp4" type="video/mp4" />
        </video>
      </motion.div>

      <p className="mx-auto mt-6 max-w-3xl text-center text-base leading-8 text-neutral-500">
        Product video: timeline, mutation playback, failure report, and reliability score in one view.
      </p>
    </section>
  );
}
