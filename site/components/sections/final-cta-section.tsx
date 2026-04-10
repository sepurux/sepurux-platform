"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buildAppAuthHref } from "@/lib/site";

export function FinalCtaSection() {
  return (
    <section className="ink-section relative overflow-hidden py-24 sm:py-28">
      <div className="site-container">
        <div className="mx-auto max-w-4xl text-center">
          <p className="section-kicker ink-kicker">Next step</p>
          <h2 className="section-heading mt-4 text-white">
            Ready to see how reliable your AI workflows really are?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
            Start free if you want to upload traces and test workflows now. Join the waitlist if
            you want a guided rollout for policy, governance, or private deployment needs.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-2">
          <a
            href={buildAppAuthHref({ mode: "access", intent: "signup" })}
            className="teal-glow-btn rounded-[32px] border border-[rgba(var(--accent-rgb),0.28)] bg-[linear-gradient(135deg,rgba(var(--accent-rgb),0.2),rgba(var(--warm-rgb),0.12)_48%,rgba(255,255,255,0.06))] p-7 text-left"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-100">
              Start free
            </p>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">
              Create a workspace and start testing real agent workflows.
            </h3>
            <p className="mt-3 max-w-md text-sm leading-7 text-slate-200">
              Best for teams that already know the first workflow they want to validate.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white">
              Create workspace
              <ArrowRight className="h-4 w-4" />
            </span>
          </a>

          <Link
            href="/waitlist"
            className="rounded-[32px] border border-white/10 bg-white/[0.05] p-7 text-left backdrop-blur-sm transition-colors hover:bg-white/[0.08]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Guided access
            </p>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">
              Join the waitlist if you want help rolling Sepurux out across your team.
            </h3>
            <p className="mt-3 max-w-md text-sm leading-7 text-slate-300">
              Best for security-conscious or enterprise teams that want onboarding help before
              broader self-serve rollout.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white">
              Join waitlist
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/docs"
            className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/6 px-5 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 hover:text-white"
          >
            Read docs
          </Link>
          <Link
            href="/waitlist"
            className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/6 px-5 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 hover:text-white"
          >
            Join waitlist
          </Link>
          {/*
          <Link
            href="/pricing"
            className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            Review pricing
          </Link>
          */}
          <Link
            href="/sandbox"
            className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            Explore sandbox
          </Link>
        </div>
      </div>
    </section>
  );
}
