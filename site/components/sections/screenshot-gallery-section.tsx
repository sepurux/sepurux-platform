"use client";

import { motion } from "framer-motion";

const screenshots = [
  { title: "Dashboard", src: "/images/dashboard.png" },
  { title: "Trace", src: "/images/trace.png" },
  { title: "Report", src: "/images/report.png" },
];

export function ScreenshotGallerySection() {
  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="site-container">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">Screenshots</p>
          <h2 className="mt-5 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-slate-950">
            Large product screenshots.
          </h2>
        </div>

        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="overflow-hidden rounded-[28px] bg-black shadow-[0_30px_80px_rgba(0,0,0,0.14)]"
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
                transition={{ duration: 0.45, ease: "easeOut", delay: index * 0.06 }}
                className="overflow-hidden rounded-[28px] bg-black shadow-[0_20px_60px_rgba(0,0,0,0.12)]"
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
