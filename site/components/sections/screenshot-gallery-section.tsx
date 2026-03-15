// site/components/sections/screenshot-gallery-section.tsx
"use client";

import { motion } from "framer-motion";

const screenshots = [
  { title: "Dashboard", src: "/images/dashboard.png" },
  { title: "Trace", src: "/images/trace.png" },
  { title: "Report", src: "/images/report.png" },
];

export function ScreenshotGallerySection() {
  return (
    <section className="bg-neutral-950 py-24 sm:py-32">
      <div className="site-container">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">Screenshots</p>
          <h2 className="mt-5 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
            Every failure, fully visible.
          </h2>
          <p className="mt-4 text-base leading-8 text-white/50">
            Replay traces, inspect mutations, and read the reliability report — all in one place.
          </p>
        </div>

        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="overflow-hidden rounded-[28px] bg-black ring-1 ring-white/[0.06]"
            style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.3)" }}
          >
            <img src={screenshots[0].src} alt={screenshots[0].title} className="h-full w-full object-cover" />
          </motion.div>

          <div className="grid gap-5">
            {screenshots.slice(1).map((shot, index) => (
              <motion.div
                key={shot.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.45, ease: "easeOut", delay: index * 0.08 }}
                className="overflow-hidden rounded-[28px] bg-black ring-1 ring-white/[0.06]"
                style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.24)" }}
              >
                <img src={shot.src} alt={shot.title} className="h-full w-full object-cover" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
