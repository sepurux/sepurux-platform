import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Coins, Gauge, Layers3 } from "lucide-react";

import { PricingComparisonSection } from "@/components/sections/pricing-comparison-section";
import { Button } from "@/components/ui/button";
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
  { label: "Scheduled pack run", credits: "pack-specific cost (default 20)" },
];

const valuePoints = [
  {
    icon: Coins,
    title: "Monthly credits",
    description:
      "Paid plans ship with monthly credit grants. Free includes a one-time signup credit grant, and top-ups stay separate from monthly allowances.",
  },
  {
    icon: Layers3,
    title: "Plan-based controls",
    description:
      "Pro unlocks policy and security controls, Team adds webhooks, and Enterprise adds audit visibility for governance.",
  },
  {
    icon: Gauge,
    title: "Collaboration gating",
    description:
      "Free and Pro are single-workspace oriented. Team and Enterprise unlock member invites and workspace expansion.",
  },
];

export default function PricingPage() {
  return (
    <div className="bg-background">
      <section className="ink-section border-b border-white/10">
        <div className="site-container py-20 md:py-28">
          <div className="max-w-5xl">
            <p className="section-kicker ink-kicker">Pricing</p>
            <h1 className="page-hero-title mt-5 max-w-4xl text-white">
              Credits for every replay, mutation, and reliability check.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-300 md:text-xl">
              Sepurux uses a subscription plus credits model. Start free, move critical jobs into
              priority execution, and scale reliability work without guessing what each run costs.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/book-demo">
                Book a demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/docs">Read docs</Link>
            </Button>
          </div>

          <div className="mt-16 grid gap-4 lg:grid-cols-3">
            {valuePoints.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.title} className="rounded-[28px] border border-white/10 bg-white/6 px-6 py-8 shadow-panel backdrop-blur-sm md:px-8">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full border"
                    style={{
                      borderColor: "rgba(var(--accent-rgb), 0.18)",
                      background: "rgba(var(--accent-rgb), 0.08)",
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
                  </div>
                  <h2 className="mt-6 text-xl font-semibold text-white">{point.title}</h2>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">{point.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="site-container py-16 md:py-24">
          <div className="max-w-3xl">
            <p className="section-kicker">Operation costs</p>
            <h2 className="section-heading mt-4 text-[--text-primary]">Predictable cost per action.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg">
              Credits are consumed only when work is executed. That makes spend easier to reason
              about than seat-heavy pricing while still matching actual reliability activity.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {operationCosts.map((item) => (
              <div key={item.label} className="rounded-[28px] border border-[--border] bg-[--surface-2] px-6 py-7 shadow-sm md:px-8">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-[--text-primary]">{item.credits}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PricingComparisonSection />

      <section className="bg-white">
        <div className="site-container py-16 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div>
              <p className="section-kicker">Need a custom rollout?</p>
              <h2 className="section-heading mt-4 text-[--text-primary]">
                Start breaking your AI agents safely.
              </h2>
            </div>
            <div>
              <p className="max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                If you need volume pricing, private deployment, or a plan shaped around governance
                requirements, we can map the subscription and credits model to your operating
                environment.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/book-demo">Book a demo</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/product">See the product</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
