"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buildAppAuthHref } from "@/lib/site";

export function FinalCtaSection() {
  return (
    <section className="ink-section relative overflow-hidden py-26 sm:py-30">
      <div className="site-container">
        <div className="mx-auto max-w-4xl text-center">
          <p className="section-kicker ink-kicker">Next step</p>
          <h2 className="section-heading mt-4 text-white">
            Ready to debug the next trace?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
            Start with the debugger, then sign in only when you want saved traces, replay history,
            compare runs, or continuous checks.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-2">
          <a
            href="/sandbox"
            className="teal-glow-btn rounded-[32px] border border-[rgba(var(--accent-rgb),0.24)] bg-[linear-gradient(150deg,rgba(var(--accent-rgb),0.28),rgba(var(--warm-rgb),0.16)_48%,rgba(255,255,255,0.07))] p-7 text-left transition-transform duration-200 hover:-translate-y-1"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-100">
              Try the debugger
            </p>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">
              Paste a trace and see what broke.
            </h3>
            <p className="mt-3 max-w-md text-sm leading-7 text-slate-200">
              Paste a trace, see what looks risky, and keep the fix moving without a sign-up wall.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white">
              Analyze Trace
              <ArrowRight className="h-4 w-4" />
            </span>
          </a>

          <a
            href={buildAppAuthHref({ mode: "access", intent: "signup", next: "/sandbox" })}
            className="rounded-[32px] border border-white/8 bg-white/[0.05] p-7 text-left backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:bg-white/[0.08]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Save it later
            </p>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">
              Sign in after the first answer.
            </h3>
            <p className="mt-3 max-w-md text-sm leading-7 text-slate-300">
              Keep the same trace for replay, compare the next run, or turn it into a continuous
              check when you need persistence.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white">
              Save traces later
              <ArrowRight className="h-4 w-4" />
            </span>
          </a>
        </div>

        <div className="mx-auto mt-8 flex max-w-5xl flex-wrap items-center justify-between gap-4 rounded-[24px] border border-white/8 bg-white/[0.03] px-5 py-4">
          <p className="text-sm text-slate-300">
            Need implementation detail first? Start with docs, then run the debugger.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/docs"
              className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 hover:text-white"
            >
              Read docs
            </Link>
            <Link
              href="/sandbox"
              className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              Analyze Trace
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
