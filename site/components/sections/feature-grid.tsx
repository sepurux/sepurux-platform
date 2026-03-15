"use client";

import { motion } from "framer-motion";
import { Gauge, Orbit, WandSparkles } from "lucide-react";

const features = [
  {
    title: "Mutation Testing",
    description: "Stress your agent with schema drift, timeouts, rate limits, and poisoning before release.",
    mediaType: "video" as const,
    src: "/videos/mutation.mp4",
    icon: WandSparkles,
  },
  {
    title: "Trace Replay",
    description: "Rewind the exact agent execution and inspect the prompt, tool call, and break point.",
    mediaType: "video" as const,
    src: "/videos/replay.mp4",
    icon: Orbit,
  },
  {
    title: "Reliability Score",
    description: "Turn failures into a report and a score that teams can understand at a glance.",
    mediaType: "image" as const,
    src: "/images/reliability.png",
    icon: Gauge,
  },
];

export function FeatureGrid() {
  return (
    <section className="mt-24 bg-[#f7f7f8] py-20 sm:mt-28 sm:py-24">
      <div className="site-container">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="section-kicker text-slate-500">Features</p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            Product surfaces, not icon marketing.
          </h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-3 lg:gap-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                whileHover={{ y: -6, scale: 1.01 }}
                transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.05 }}
                className="group rounded-[26px] border border-slate-200 bg-black p-6 transition-colors hover:border-blue-500/45"
              >
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <Icon className="h-5 w-5 text-blue-500" />
                </div>
                <div className="overflow-hidden rounded-xl border border-neutral-900 bg-neutral-950">
                  {feature.mediaType === "video" ? (
                    <video
                      className="aspect-video h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                    >
                      <source src={feature.src} type="video/mp4" />
                    </video>
                  ) : (
                    <img
                      src={feature.src}
                      alt={feature.title}
                      className="aspect-video h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  )}
                </div>
                <h3 className="mt-6 font-display text-2xl font-semibold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-neutral-400">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
