// site/components/sections/hero-section.tsx
"use client";

import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";

import { buildAppAuthHref } from "@/lib/site";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};

export function HeroSection() {
  return (
    <section className="ink-section relative overflow-hidden py-28 sm:py-36">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_58%)] opacity-60" />
      <div className="site-container relative z-10">
        <div className="mx-auto max-w-5xl text-center">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.11 } } }}
          >
            {/* Announcement badge */}
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-[rgba(var(--warm-rgb),0.28)] bg-[linear-gradient(135deg,rgba(var(--warm-rgb),0.14),rgba(var(--accent-rgb),0.10))] px-3 py-1 text-emerald-50"
            >
              <span
                className="pulse-dot h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--color-accent)" }}
              />
              <span className="text-sm font-medium">
                Scenario coverage gate now available
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mx-auto max-w-4xl text-balance font-display text-[clamp(3.6rem,7vw,6rem)] font-semibold leading-[0.92] tracking-[-0.04em]"
              style={{ color: "#F8FAFC" }}
            >
              Chaos Engineering for AI Agents
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mx-auto mt-7 max-w-xl text-lg leading-8 text-slate-300"
            >
              The chaos engineering platform for AI agents. Validate failure modes in staging before
              they impact production.
            </motion.p>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mt-10 flex flex-wrap items-center justify-center gap-3"
            >
              <a
                href={buildAppAuthHref({ mode: "access", intent: "signup" })}
                className="teal-glow-btn inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white"
                style={{ background: "var(--color-accent)" }}
              >
                Try Sepurux
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href={buildAppAuthHref({ mode: "demo" })}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/6 px-6 text-sm font-semibold text-slate-100 transition-colors hover:border-white/30 hover:bg-white/10"
              >
                <PlayCircle className="h-4 w-4" />
                View Demo
              </a>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
