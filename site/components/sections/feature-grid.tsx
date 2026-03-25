// site/components/sections/feature-grid.tsx
"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Gauge, Orbit, WandSparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type VideoFeature = {
  title: string;
  description: string;
  mediaType: "video";
  src: string;
  icon: LucideIcon;
};

type ImageFeature = {
  title: string;
  description: string;
  mediaType: "image";
  src: string;
  alt: string;
  width: number;
  height: number;
  icon: LucideIcon;
};

type Feature = VideoFeature | ImageFeature;

const features: Feature[] = [
  {
    title: "Mutation Testing",
    description: "Stress your agent with schema drift, timeouts, rate limits, and poisoning before release.",
    mediaType: "video",
    src: "/videos/mutation.mp4",
    icon: WandSparkles,
  },
  {
    title: "Trace Replay",
    description: "Rewind the exact agent execution and inspect the prompt, tool call, and break point.",
    mediaType: "video",
    src: "/videos/replay.mp4",
    icon: Orbit,
  },
  {
    title: "Reliability Score",
    description: "Turn failures into a report and a score that teams can understand at a glance.",
    mediaType: "image",
    src: "/images/reliability.png",
    alt: "Sepurux reliability score showing agent failure breakdown",
    width: 1861,
    height: 959,
    icon: Gauge,
  },
];

export function FeatureGrid() {
  return (
    <section className="bg-neutral-950 py-24 sm:py-32">
      <div className="site-container">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">Features</p>
          <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
            Product surfaces, not icon marketing.
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.06 }}
                className="group relative overflow-hidden rounded-[28px] bg-neutral-950 ring-1 ring-white/[0.06] transition-all duration-300 hover:ring-[rgba(0,229,204,0.2)]"
              >
                {/* teal left-border accent on hover */}
                <div
                  className="absolute left-0 top-0 h-full w-0.5 origin-top scale-y-0 rounded-full transition-transform duration-300 group-hover:scale-y-100"
                  style={{ background: "var(--accent-teal)" }}
                />

                <div className="overflow-hidden">
                  {feature.mediaType === "video" ? (
                    <video
                      className="aspect-video h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                    >
                      <source src={feature.src} type="video/mp4" />
                    </video>
                  ) : (
                    <Image
                      src={feature.src}
                      alt={feature.alt}
                      width={feature.width}
                      height={feature.height}
                      priority
                      className="aspect-video h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  )}
                </div>

                <div className="p-7">
                  <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/6">
                    <Icon className="h-4 w-4 text-white/70" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2.5 text-sm leading-7 text-neutral-400">{feature.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
