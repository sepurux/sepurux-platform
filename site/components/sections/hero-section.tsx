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
        className="absolute inset-0 h-full w-full object-cover opacity-80"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/40" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.25)_0%,rgba(0,0,0,0.72)_100%)]" />
      <div className="site-container relative flex h-full items-center justify-center">
        <div className="max-w-5xl text-center">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.11 } } }}
            className="relative z-10"
          >
            <motion.h1
              variants={fadeUp}
              className="mx-auto max-w-4xl text-balance font-display text-[clamp(3.6rem,6vw,4.5rem)] font-semibold leading-[0.94] tracking-[-0.03em] text-white"
            >
              Chaos Engineering for AI Agents
            </motion.h1>

            <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-neutral-400">
              Break your AI workflows before production does.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <a href={buildAppAuthHref({ mode: "access", intent: "signup" })}>
                  Try Sepurux
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={buildAppAuthHref({ mode: "demo" })}>
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
