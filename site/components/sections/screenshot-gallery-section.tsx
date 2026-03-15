"use client";

import { motion } from "framer-motion";

const screenshots = [
  { title: "Dashboard", src: "/images/dashboard.png" },
  { title: "Trace", src: "/images/trace.png" },
  { title: "Report", src: "/images/report.png" },
];

export function ScreenshotGallerySection() {
  return (
    <section className="site-container mt-24 sm:mt-28">
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="section-kicker">Screenshots</p>
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white md:text-5xl">
          Large product screenshots.
        </h2>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="overflow-hidden rounded-xl border border-neutral-900 bg-black"
        >
          <img src={screenshots[0].src} alt={screenshots[0].title} className="h-full w-full object-cover" />
        </motion.div>

        <div className="grid gap-6">
          {screenshots.slice(1).map((shot, index) => (
            <motion.div
              key={shot.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.05 }}
              className="overflow-hidden rounded-xl border border-neutral-900 bg-black"
            >
              <img src={shot.src} alt={shot.title} className="h-full w-full object-cover" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
