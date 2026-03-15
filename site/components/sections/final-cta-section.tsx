// site/components/sections/final-cta-section.tsx
"use client";

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

      <div className="site-container relative z-10 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">Start now</p>
        <h2 className="mx-auto mt-5 max-w-3xl font-display text-[clamp(2rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-white">
          Ship AI agents that don't break in production.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-neutral-400">
          Push changes faster with deterministic replays, mutation stress tests, and policy-aware CI checks.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a
            href={buildAppAuthHref({ mode: "access", intent: "signup" })}
            className="teal-glow-btn inline-flex h-12 items-center justify-center gap-2 rounded-full border px-8 text-sm font-semibold text-white"
            style={{
              borderColor: "rgba(0,229,204,0.4)",
              background: "rgba(0,229,204,0.1)",
            }}
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </a>
          <Button asChild size="lg" variant="outline">
            <a href={buildAppAuthHref({ mode: "demo" })}>View Demo</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
