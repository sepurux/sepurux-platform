"use client";

import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildAppAuthHref } from "@/lib/site";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};

export function HeroSection() {
  return (
    <section className="relative h-[calc(100vh-64px)] min-h-[720px] overflow-hidden">
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-90"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>

      {/* top fade */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent" />
      {/* bottom fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black to-transparent" />
      {/* overall darkening */}
      <div className="pointer-events-none absolute inset-0 bg-black/30" />

      <div className="site-container relative flex h-full items-center justify-center">
        <div className="max-w-5xl text-center">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.11 } } }}
            className="relative z-10"
          >
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mb-6 text-[11px] font-medium uppercase tracking-[0.22em] text-white/50"
            >
              Chaos Engineering for AI
            </motion.p>

            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mx-auto max-w-4xl text-balance font-display text-[clamp(3.6rem,7vw,6rem)] font-semibold leading-[0.92] tracking-[-0.04em] text-white"
            >
              Chaos Engineering for AI Agents
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mx-auto mt-7 max-w-xl text-lg leading-8 text-white/60"
            >
              Break your AI workflows before production does.
            </motion.p>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mt-10 flex flex-wrap items-center justify-center gap-3"
            >
              <Button asChild size="lg">
                <a href={buildAppAuthHref({ mode: "access", intent: "signup" })}>
                  Try Sepurux
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <a href={buildAppAuthHref({ mode: "demo" })} className="text-white/80 hover:text-white">
                  <PlayCircle className="h-4 w-4" />
                  View Demo
                </a>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
