// site/components/sections/hero-section.tsx
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

      {/* teal gradient orb behind headline */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "900px",
          height: "600px",
          background: "radial-gradient(ellipse at center, rgba(0,229,204,0.10) 0%, transparent 65%)",
          filter: "blur(40px)",
        }}
      />

      <div className="site-container relative flex h-full items-center justify-center">
        <div className="max-w-5xl text-center">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.11 } } }}
            className="relative z-10"
          >
            {/* Terminal-style animated badge */}
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5"
              style={{
                borderColor: "rgba(0,229,204,0.25)",
                background: "rgba(0,229,204,0.06)",
              }}
            >
              <span
                className="pulse-dot h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--accent-teal)" }}
              />
              <span
                className="font-mono text-[11px] font-medium tracking-wide"
                style={{ color: "var(--accent-teal)" }}
              >
                Live in pilot with 12 teams
              </span>
            </motion.div>
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
              The chaos engineering platform for AI agents. Validate failure modes in staging before
              they impact production.
            </motion.p>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mx-auto mt-4 max-w-2xl text-base font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--accent-teal)" }}
            >
              Multi-agent support is coming soon.
            </motion.p>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mt-10 flex flex-wrap items-center justify-center gap-3"
            >
              <a
                href={buildAppAuthHref({ mode: "access", intent: "signup" })}
                className="teal-glow-btn inline-flex h-11 items-center justify-center gap-2 rounded-full border px-6 text-sm font-semibold text-white"
                style={{
                  borderColor: "rgba(0,229,204,0.4)",
                  background: "rgba(0,229,204,0.1)",
                }}
              >
                Try Sepurux
                <ArrowRight className="h-4 w-4" />
              </a>
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
