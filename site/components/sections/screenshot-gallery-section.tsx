"use client";

import { motion } from "framer-motion";
import { ScanSearch } from "lucide-react";

const screenshots = [
  { title: "Dashboard", src: "/images/dashboard.png" },
  { title: "Trace", src: "/images/trace.png" },
  { title: "Report", src: "/images/report.png" },
];

export function ScreenshotGallerySection() {
  return (
    <section className="mt-24 bg-white py-20 sm:mt-28 sm:py-24">
      <div className="site-container">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
            <ScanSearch className="h-4 w-4 text-blue-600" />
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-600">Screenshots</p>
          </div>
          <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            Large product screenshots.
          </h2>
        </div>

        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="overflow-hidden rounded-[28px] border border-slate-200 bg-black shadow-[0_30px_90px_rgba(15,23,42,0.16)]"
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
                className="overflow-hidden rounded-[28px] border border-slate-200 bg-black shadow-[0_30px_90px_rgba(15,23,42,0.12)]"
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
