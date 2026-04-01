"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { buildAppAuthHref } from "@/lib/site";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};

const proofPoints = [
  "Trace-first testing",
  "Policy-aware CI gates",
  "Replay, mutation, and governance in one system",
];

const evidenceStats = [
  ["SDKs", "Python, TS, Go"],
  ["Gate", "Scenario coverage + pass/fail"],
  ["Controls", "Policy, security, audit"],
] as const;

const heroHeadline = "Move AI reliability from intuition into release discipline.";

export function HeroSection() {
  const [typedHeadline, setTypedHeadline] = useState("");

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
          if (intervalId != null) {
            window.clearInterval(intervalId);
          }
        }
      }, 32);
    }, 240);

    return () => {
      window.clearTimeout(startTimeout);
      if (intervalId != null) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return (
    <section className="ink-section relative overflow-hidden pb-24 pt-18 sm:pb-28 sm:pt-22">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_56%)]" />

      <div className="site-container relative z-10">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          className="w-full"
        >
          <div className="w-full">
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
              className="hero-title mt-7 w-full max-w-none text-white"
              aria-label={heroHeadline}
            >
              <span>{typedHeadline}</span>
              {typedHeadline.length < heroHeadline.length ? <span className="terminal-caret ml-1 align-[-0.08em]" aria-hidden /> : null}
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.48, ease: "easeOut" }}
              className="mt-6 w-full max-w-none text-lg leading-8 text-slate-300 md:text-xl"
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
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/6 px-6 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 hover:text-white"
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

            <motion.ul
              variants={fadeUp}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="mt-10 grid gap-4 lg:grid-cols-3"
            >
              {proofPoints.map((item) => (
                <li
                  key={item}
                  className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-200"
                >
                  <span className="mb-3 block h-1.5 w-10 rounded-full bg-[var(--color-accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </motion.ul>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mt-10 grid gap-4 border-t border-white/10 pt-6 lg:grid-cols-3"
            >
              {evidenceStats.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-5"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-100">{value}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
