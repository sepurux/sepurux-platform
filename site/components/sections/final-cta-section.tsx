// site/components/sections/final-cta-section.tsx
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildAppAuthHref } from "@/lib/site";

export function FinalCtaSection() {
  return (
    <section className="ink-section relative overflow-hidden py-28 sm:py-36">
      <div className="site-container">
        <p className="section-kicker ink-kicker text-center">Start now</p>
        <h2
          className="mx-auto mt-5 max-w-3xl text-center font-display text-[clamp(2rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.04em]"
          style={{ color: "#F8FAFC" }}
        >
          Ship AI agents that don&apos;t break in production.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-center text-base leading-8 text-slate-300">
          Push changes faster with deterministic replays, mutation stress tests, and policy-aware CI checks.
        </p>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
          {/* "Start free" card */}
          <a
            href={buildAppAuthHref({ mode: "access", intent: "signup" })}
            className="teal-glow-btn group rounded-2xl border border-[rgba(var(--warm-rgb),0.22)] bg-[linear-gradient(135deg,rgba(var(--warm-rgb),0.18),rgba(var(--accent-rgb),0.14))] p-6 text-left transition-all hover:brightness-[1.02]"
            style={{ boxShadow: "0 8px 28px rgba(var(--warm-rgb), 0.16)" }}
          >
            <p className="text-xs font-mono font-semibold uppercase tracking-[0.2em] text-emerald-50">
              Start free
            </p>
            <h3 className="mt-3 font-display text-2xl font-semibold text-white">
              Create your Sepurux workspace
            </h3>
            <p className="mt-3 text-sm leading-7 text-emerald-50/84">
              Best for teams that want to capture traces and add CI gating this week.
            </p>
            <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-white transition-all group-hover:gap-2">
              Get access
              <ArrowRight className="h-4 w-4" />
            </span>
          </a>

          {/* "Enterprise" card — white */}
          <Link
            href="/book-demo"
            className="group rounded-2xl border border-white/10 bg-white/6 p-6 text-left transition-all hover:border-white/20 hover:bg-white/10"
            style={{ boxShadow: "0 18px 36px rgba(0, 0, 0, 0.22)" }}
          >
            <p
              className="text-xs font-mono font-semibold uppercase tracking-[0.2em]"
              style={{ color: "var(--color-warm)" }}
            >
              Enterprise
            </p>
            <h3 className="mt-3 font-display text-2xl font-semibold text-white">
              Book architecture review
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              For compliance-heavy rollouts, audit programs, and private deployment planning.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white">
              Book demo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" variant="outline">
            <a href={buildAppAuthHref({ mode: "demo" })}>View Demo</a>
          </Button>
          <Link
            href="/docs"
            className="text-sm font-semibold text-slate-300 underline underline-offset-4 hover:text-white"
          >
            Read docs
          </Link>
        </div>
      </div>
    </section>
  );
}
