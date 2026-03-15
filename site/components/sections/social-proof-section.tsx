// site/components/sections/social-proof-section.tsx
"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "12", label: "Pilot Teams" },
  { value: "3", label: "Enterprise Evaluations" },
  { value: "99.2%", label: "Failure Detection Rate" },
  { value: "< 200ms", label: "Replay Latency" },
];

export function SocialProofSection() {
  return (
    <section
      className="bg-black"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.08)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="site-container py-10 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-wrap items-stretch justify-center divide-y divide-white/8 sm:divide-x sm:divide-y-0"
        >
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="flex w-full flex-col items-center px-8 py-6 text-center sm:w-auto sm:flex-1 sm:py-0"
            >
              <span
                className="font-display text-[clamp(1.8rem,3.5vw,2.8rem)] font-bold tabular-nums leading-none tracking-tight text-white"
              >
                {stat.value}
              </span>
              <span className="mt-2 text-sm font-medium text-white/40">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
