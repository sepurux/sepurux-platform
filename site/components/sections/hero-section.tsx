"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck } from "lucide-react";

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
        className="absolute inset-0 h-full w-full object-cover opacity-55"
        src="/videos/hero.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden
      />

      {/* Dark overlay tuned to keep the footage visible while pushing the hero back. */}
      <div className="absolute inset-0 bg-[var(--ink-950)]/92" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink-950)] via-[var(--ink-950)]/86 to-[var(--ink-950)]/62" />
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--ink-950)]/96 via-[var(--ink-950)]/74 to-[var(--ink-950)]/84" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(5,9,18,0.34)_0%,rgba(5,9,18,0.68)_54%,rgba(5,9,18,0.96)_100%)]" />

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

      <div className="site-container relative z-10 py-24 sm:py-32">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)] lg:items-end"
        >
          <div className="max-w-3xl">
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="accent-badge inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]"
            >
              Reliability testing for AI agents
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
                href="/waitlist"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 text-sm font-medium text-slate-100 backdrop-blur-sm transition-colors hover:bg-white/16 hover:text-white"
              >
                Join waitlist
              </Link>
              <Link
                href="/docs/getting-started"
                className="inline-flex h-12 items-center justify-center px-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
              >
                Read quickstart
              </Link>
            </motion.div>
          </div>

          <motion.aside
            variants={fadeUp}
            transition={{ duration: 0.52, ease: "easeOut" }}
            className="proof-panel p-5 sm:p-6"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Release signal
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
              One pass/fail verdict your team can trust.
            </h2>

            <div className="mt-6 space-y-3">
              <div className="proof-row">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Trace replay</p>
                  <p className="mt-1 text-sm font-medium text-slate-200">Replay from real production flow</p>
                </div>
                <span className="metric-chip">Deterministic</span>
              </div>
              <div className="proof-row">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Mutation pressure</p>
                  <p className="mt-1 text-sm font-medium text-slate-200">Failures injected on critical tools</p>
                </div>
                <span className="metric-chip">Targeted</span>
              </div>
              <div className="proof-row">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Policy gate</p>
                  <p className="mt-1 text-sm font-medium text-slate-200">Unsafe runs block release</p>
                </div>
                <span className="metric-chip">Enforced</span>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3.5 py-3 text-sm text-emerald-100">
              <BadgeCheck className="h-4 w-4 shrink-0" />
              CI output is deterministic and auditable per run.
            </div>
          </motion.aside>
        </motion.div>
      </div>

      {/* Bottom fade into next section */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--ink-950)] to-transparent" />
    </section>
  );
}
