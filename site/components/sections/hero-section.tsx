"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, FileSearch, History, RotateCcw, Sparkles } from "lucide-react";

import { buildAppAuthHref } from "@/lib/site";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};

const proofRows = [
  {
    label: "Issue location",
    value: "Step 04 · payments.refund",
    hint: "The first issue signal appears here.",
    icon: FileSearch,
  },
  {
    label: "Likely cause",
    value: "Schema drift in the tool response",
    hint: "The payload no longer matches the expected shape.",
    icon: Sparkles,
  },
  {
    label: "Suggested fix",
    value: "Patch the adapter, then replay the trace",
    hint: "Use the same input to confirm the fix before shipping.",
    icon: RotateCcw,
  },
];

const chips = ["JSON traces", "logs", "trace IDs", "semi-structured text"];

export function HeroSection() {
  return (
    <section className="relative flex min-h-[92vh] items-center overflow-hidden">
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-35"
        src="/videos/hero.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden
      />
      <div className="absolute inset-0 bg-[rgba(5,4,3,0.9)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-[rgba(5,4,3,0.92)] via-[rgba(9,7,5,0.74)] to-[rgba(5,4,3,0.45)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,122,26,0.24),transparent_36%),radial-gradient(circle_at_84%_8%,rgba(251,146,60,0.16),transparent_32%)]" />

      <div className="site-container relative z-10 py-24 sm:py-28 lg:py-32">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="grid gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-center"
        >
          <div className="max-w-3xl">
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="accent-badge inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] shadow-[0_10px_24px_rgba(255,122,26,0.12)]"
            >
              Agent trace debugger
            </motion.div>

            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.52, ease: "easeOut" }}
              className="hero-title mt-7 text-white"
            >
              Paste a trace. See what broke.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.48, ease: "easeOut" }}
              className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl"
            >
              Drop in JSON, logs, or semi-structured text and get the issue location, likely cause, and next fix in seconds. Save traces, replay later, and run CI checks after the first answer.
            </motion.p>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link
                href="/sandbox"
                className="teal-glow-btn inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.28)] bg-[var(--color-accent)] px-6 text-sm font-semibold text-white"
              >
                Analyze Trace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={buildAppAuthHref({ mode: "access", intent: "signup", next: "/sandbox" })}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/6 px-6 text-sm font-medium text-slate-100 backdrop-blur-sm transition-colors hover:border-white/16 hover:bg-white/10 hover:text-white"
              >
                Save traces later
              </a>
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="mt-8 flex flex-wrap gap-2"
            >
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300"
                >
                  {chip}
                </span>
              ))}
            </motion.div>
          </div>

          <motion.aside
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="proof-panel p-6 sm:p-7 lg:p-8"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">What the debugger returns</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                  What broke, why it failed, next fix.
                </h2>
              </div>
              <span className="metric-chip inline-flex items-center gap-1.5">
                <BadgeCheck className="h-4 w-4" />
                Instant
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {proofRows.map((row) => {
                const Icon = row.icon;
                return (
                  <motion.div
                    key={row.label}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="rounded-[22px] border border-white/8 bg-white/[0.035] p-4 shadow-[0_16px_30px_rgba(0,0,0,0.12)]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-slate-100">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{row.label}</p>
                        <p className="mt-2 text-sm font-medium text-white">{row.value}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-300">{row.hint}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-300/18 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
              No signup required for the first analysis. Sign in only when you want persistence, replay, or team workflows.
            </div>
          </motion.aside>
        </motion.div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--ink-950)] to-transparent" />
    </section>
  );
}
