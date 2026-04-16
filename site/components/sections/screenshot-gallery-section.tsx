// site/components/sections/screenshot-gallery-section.tsx
"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const screenshots = [
  {
    title: "Dashboard",
    src: "/images/dashboard.png",
    alt: "Sepurux dashboard showing agent trace replay and stress test timeline",
    width: 1859,
    height: 964,
  },
  {
    title: "Trace",
    src: "/images/trace.png",
    alt: "Sepurux trace view with prompt, tool call, and breakpoint inspection",
    width: 3016,
    height: 1620,
  },
  {
    title: "Report",
    src: "/images/report.png",
    alt: "Sepurux reliability score report summarizing agent failure analysis",
    width: 3022,
    height: 1618,
  },
];

export function ScreenshotGallerySection() {
  return (
    <section className="bg-transparent py-24 sm:py-32">
      <div className="site-container">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="section-kicker">Screenshots</p>
          <h2
            className="mt-5 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]"
            style={{ color: "var(--text-primary)" }}
          >
            Every failure, fully visible.
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-400">
            Replay traces, review stress test results, and read the failure report — all in one place.
          </p>
        </div>

        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="overflow-hidden rounded-[28px] border border-[--border] bg-[rgba(13,22,41,0.6)]"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <Image
              src={screenshots[0].src}
              alt={screenshots[0].alt}
              width={screenshots[0].width}
              height={screenshots[0].height}
              className="h-full w-full object-cover"
            />
          </motion.div>

          <div className="grid gap-5">
            {screenshots.slice(1).map((shot, index) => (
              <motion.div
                key={shot.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.45, ease: "easeOut", delay: index * 0.08 }}
                className="overflow-hidden rounded-[28px] border border-[--border] bg-[rgba(13,22,41,0.6)]"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  width={shot.width}
                  height={shot.height}
                  className="h-full w-full object-cover"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
