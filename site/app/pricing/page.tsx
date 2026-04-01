import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Coins, Gauge, Layers3 } from "lucide-react";

import { PricingComparisonSection } from "@/components/sections/pricing-comparison-section";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing",
  description:
    "Subscription and credit pricing for Sepurux. Free includes one-time signup credits, while paid plans add recurring monthly credits and priority execution.",
  path: "/pricing",
});

const operationCosts = [
  { label: "Trace replay", credits: "5 credits" },
  { label: "Mutation campaign", credits: "20 credits" },
  { label: "Large campaign", credits: "50 credits (>=50 attempts)" },
  { label: "Scheduled pack run", credits: "Pack-specific cost (default 20)" },
];

const valuePoints = [
  {
    icon: Coins,
    title: "Credits map to executed work",
    description:
      "Spend tracks replay, campaigns, and mutation volume rather than generic seat inflation.",
  },
  {
    icon: Layers3,
    title: "Plans unlock control layers",
    description:
      "Move from individual validation to shared workspaces, webhooks, audit visibility, and enterprise governance.",
  },
  {
    icon: Gauge,
    title: "Queueing matches urgency",
    description:
      "Keep early work inexpensive, then move critical runs into priority execution as reliability becomes release-critical.",
  },
];

export default function PricingPage() {
  return (
    <div className="page-shell bg-background">
      <section className="page-hero-shell">
        <div className="site-container relative z-10 py-16 md:py-24">
          <div className="max-w-5xl">
            <p className="section-kicker ink-kicker">Pricing</p>
            <h1 className="page-hero-title mt-5 max-w-4xl text-white">
              Credits for every replay, mutation, and release check.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-300 md:text-xl">
              Sepurux uses a subscription plus credits model. Start free, then scale into priority
              execution and governance controls as the reliability program matures.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/book-demo"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.28)] bg-[var(--color-accent)] px-6 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Book a demo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/6 px-6 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 hover:text-white"
            >
              Read docs
            </Link>
          </div>

          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {valuePoints.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.title} className="ink-card-soft rounded-[28px] p-6 md:p-7">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border"
                    style={{
                      borderColor: "rgba(var(--accent-rgb), 0.18)",
                      background: "rgba(var(--accent-rgb), 0.08)",
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
                  </div>
                  <h2 className="mt-6 text-xl font-semibold text-white">{point.title}</h2>
                  <p className="mt-3 max-w-sm text-sm leading-7 text-slate-300">{point.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-transparent">
        <div className="site-container py-14 md:py-16">
          <div className="page-surface p-8 md:p-10">
            <div className="max-w-3xl">
              <p className="section-kicker">Operation costs</p>
              <h2 className="section-heading mt-4 text-[--text-primary]">Predictable cost per action.</h2>
              <p className="mt-4 text-base leading-7 text-slate-300 md:text-lg">
                Credits are consumed only when work is executed. That keeps spending easier to
                reason about than seat-heavy pricing while still matching actual reliability
                activity.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {operationCosts.map((item) => (
                <div key={item.label} className="rounded-[26px] border border-[--border] bg-white/74 px-6 py-7 shadow-[0_12px_28px_rgba(16,11,6,0.04)] md:px-8">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                  <p className="mt-4 text-3xl font-semibold tracking-tight text-[--text-primary]">{item.credits}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PricingComparisonSection />

      <section className="bg-transparent pb-16 md:pb-20">
        <div className="site-container">
          <div className="page-surface p-8 md:p-10">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
              <div>
                <p className="section-kicker">Need a custom rollout?</p>
                <h2 className="section-heading mt-4 text-[--text-primary]">
                  Shape the plan around your release model.
                </h2>
              </div>
              <div>
                <p className="max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                  If you need volume pricing, private deployment, or a plan shaped around governance
                  requirements, we can map the subscription and credits model to your operating
                  environment.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/book-demo"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-[rgba(var(--accent-rgb),0.24)] bg-[var(--color-accent)] px-6 text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    Book a demo
                  </Link>
                  <Link
                    href="/product"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-[--border] bg-white/8 px-6 text-sm font-medium text-[--text-primary] transition-colors hover:border-[rgba(var(--accent-rgb),0.24)] hover:text-[--color-accent]"
                  >
                    See the product
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
