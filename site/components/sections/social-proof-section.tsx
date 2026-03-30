// site/components/sections/social-proof-section.tsx
"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "12", label: "Pilot Teams" },
  { value: "3", label: "Enterprise Evaluations" },
  { value: "99.2%", label: "Failure Detection Rate" },
  { value: "< 200ms", label: "Replay Latency" },
];

const testimonials = [
  {
    quote: "Sepurux caught a prompt injection vector in staging that would have silently corrupted our agent's tool output in production.",
    cite: "— Lead AI Engineer, Series B startup",
  },
  {
    quote: "The trace replay alone cut our post-incident investigation time from hours to minutes.",
    cite: "— Staff Engineer, Enterprise SaaS",
  },
  {
    quote: "Finally a reliability framework built for agents — not just a wrapper around unit tests.",
    cite: "— Head of Platform, AI-native company",
  },
];

export function SocialProofSection() {
  return (
    <section className="ink-section-muted">
      <div className="site-container py-10 sm:py-12">
        {/* stat strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="grid grid-cols-2 divide-x divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-0 backdrop-blur-sm sm:grid-cols-4 sm:divide-y-0"
          style={{ boxShadow: "0 18px 40px rgba(0, 0, 0, 0.24)" }}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center px-8 py-6 text-center"
            >
              <span
                className="font-display text-[clamp(1.8rem,3.5vw,2.8rem)] font-bold tabular-nums leading-none tracking-tight"
                style={{ color: "var(--color-warm)" }}
              >
                {stat.value}
              </span>
              <span className="mt-1 text-sm text-slate-300">{stat.label}</span>
            </div>
          ))}
        </motion.div>

        {/* testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
          className="mt-6 flex flex-wrap justify-center gap-4"
        >
          {testimonials.map((t) => (
            <blockquote
              key={t.cite}
              className="w-full max-w-sm flex-1 rounded-xl border border-white/10 bg-white/6 p-5 text-sm leading-7 backdrop-blur-sm"
              style={{ boxShadow: "0 12px 32px rgba(0, 0, 0, 0.18)" }}
            >
              <p className="italic text-slate-100">&ldquo;{t.quote}&rdquo;</p>
              <cite className="mt-3 block not-italic text-xs text-slate-400">{t.cite}</cite>
            </blockquote>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
