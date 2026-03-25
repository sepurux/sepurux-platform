// site/components/sections/final-cta-section.tsx
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildAppAuthHref } from "@/lib/site";

export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden bg-black py-28 sm:py-36">
      {/* stronger teal radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% -5%, rgba(0,229,204,0.14) 0%, transparent 70%)",
        }}
      />
      {/* secondary white glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_-10%,rgba(255,255,255,0.04),transparent)]" />

      <div className="site-container relative z-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">Start now</p>
        <h2 className="mx-auto mt-5 max-w-3xl text-center font-display text-[clamp(2rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-white">
          Ship AI agents that don't break in production.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-center text-base leading-8 text-neutral-400">
          Push changes faster with deterministic replays, mutation stress tests, and policy-aware CI checks.
        </p>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
          <a
            href={buildAppAuthHref({ mode: "access", intent: "signup" })}
            className="teal-glow-btn group rounded-3xl border p-7 text-left transition-colors"
            style={{
              borderColor: "rgba(0,229,204,0.4)",
              background: "rgba(0,229,204,0.1)",
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-teal)]">Start free</p>
            <h3 className="mt-3 font-display text-2xl font-semibold text-white">Create your Sepurux workspace</h3>
            <p className="mt-3 text-sm leading-7 text-white/80">
              Best for teams that want to capture traces and add CI gating this week.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white">
              Get access
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </a>

          <Link
            href="/book-demo"
            className="group rounded-3xl border border-white/15 bg-white/[0.04] p-7 text-left transition-colors hover:border-white/25 hover:bg-white/[0.07]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Enterprise</p>
            <h3 className="mt-3 font-display text-2xl font-semibold text-white">Book architecture review</h3>
            <p className="mt-3 text-sm leading-7 text-neutral-300">
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
          <Link href="/docs" className="text-sm font-semibold text-white/75 underline underline-offset-4 hover:text-white">
            Read docs
          </Link>
        </div>
      </div>
    </section>
  );
}
