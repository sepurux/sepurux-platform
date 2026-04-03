"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { buildAppAuthHref } from "@/lib/site";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};

const heroHeadline = "Move AI reliability from intuition into release discipline.";

export function HeroSection() {
  const [typedHeadline, setTypedHeadline] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTypedHeadline(heroHeadline);
      return;
    }

    setTypedHeadline("");
    let index = 0;
    let intervalId: number | null = null;
    const startTimeout = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        index += 1;
        setTypedHeadline(heroHeadline.slice(0, index));
        if (index >= heroHeadline.length) {
          if (intervalId != null) window.clearInterval(intervalId);
        }
      }, 32);
    }, 240);

    return () => {
      window.clearTimeout(startTimeout);
      if (intervalId != null) window.clearInterval(intervalId);
    };
  }, []);

  return (
    <section className="relative min-h-[92vh] overflow-hidden flex items-center">
      {/* Video background */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src="/videos/hero.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden
      />

      {/* Dark overlay — gradient from bottom for text legibility */}
      <div className="absolute inset-0 bg-[var(--ink-950)]/60" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink-950)] via-[var(--ink-950)]/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--ink-950)]/70 via-transparent to-transparent" />

      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)",
          backgroundSize: "96px 96px",
          maskImage: "linear-gradient(180deg,rgba(0,0,0,0.8),transparent 90%)",
        }}
      />

      <div className="site-container relative z-10 py-28 sm:py-36">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          className="max-w-3xl"
        >
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="accent-badge inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]"
          >
            Reliability infrastructure for AI agents
          </motion.div>

          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="hero-title mt-7 text-white"
            aria-label={heroHeadline}
          >
            <span>{typedHeadline}</span>
            {typedHeadline.length < heroHeadline.length ? (
              <span className="terminal-caret ml-1 align-[-0.08em]" aria-hidden />
            ) : null}
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.48, ease: "easeOut" }}
            className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl"
          >
            Record production-like traces, replay them under controlled failure, enforce policy
            gates, and let CI block brittle agent behavior before it reaches customers.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="mt-10 flex flex-wrap gap-3"
          >
            <a
              href={buildAppAuthHref({ mode: "access", intent: "signup" })}
              className="teal-glow-btn inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.34)] bg-[var(--color-accent)] px-6 text-sm font-semibold text-white"
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/book-demo"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 text-sm font-medium text-slate-100 backdrop-blur-sm transition-colors hover:bg-white/16 hover:text-white"
            >
              Book demo
            </Link>
            <Link
              href="/sandbox"
              className="inline-flex h-12 items-center justify-center px-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              Explore sandbox
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom fade into next section */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--ink-950)] to-transparent" />
    </section>
  );
}
