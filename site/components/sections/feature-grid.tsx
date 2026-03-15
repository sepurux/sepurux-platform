"use client";

import { motion } from "framer-motion";

const features = [
  {
    title: "Mutation Testing",
    description: "Stress your agent with schema drift, timeouts, rate limits, and poisoning before release.",
    mediaType: "video" as const,
    src: "/videos/mutation.mp4",
  },
  {
    title: "Trace Replay",
    description: "Rewind the exact agent execution and inspect the prompt, tool call, and break point.",
    mediaType: "video" as const,
    src: "/videos/replay.mp4",
  },
  {
    title: "Reliability Score",
    description: "Turn failures into a report and a score that teams can understand at a glance.",
    mediaType: "image" as const,
    src: "/images/reliability.png",
  },
];

export function FeatureGrid() {
  return (
    <section className="site-container mt-24 sm:mt-28">
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="section-kicker">Features</p>
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white md:text-5xl">
          Product surfaces, not icon marketing.
        </h2>
      </div>

      <div className="grid gap-8 lg:grid-cols-3 lg:gap-12">
        {features.map((feature, index) => {
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                whileHover={{ y: -6, scale: 1.01 }}
                transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.05 }}
                className="group rounded-xl border border-neutral-900 bg-black p-6 transition-colors hover:border-blue-500/70"
              >
                <div className="overflow-hidden rounded-xl border border-neutral-900 bg-neutral-950">
                  {feature.mediaType === "video" ? (
                    <video className="aspect-video h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" autoPlay muted loop playsInline preload="auto">
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
                <p className="mt-3 text-sm leading-7 text-neutral-500">{feature.description}</p>
              </motion.div>
            );
        })}
      </div>
    </section>
  );
}
