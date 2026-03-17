// site/app/pricing/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Coins, Gauge, Layers3, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildPageMetadata } from "@/lib/site";
import { pricingTiers } from "@/lib/pricing";

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing",
  description:
    "Subscription and credit pricing for Sepurux. Run replay campaigns, mutation packs, and reliability checks with monthly credits and priority execution.",
  path: "/pricing",
});

const operationCosts = [
  { label: "Trace replay", credits: "5 credits" },
  { label: "Mutation campaign", credits: "20 credits" },
  { label: "Large campaign", credits: "50 credits" },
  { label: "Scheduled pack run", credits: "pack credit cost" },
];

const valuePoints = [
  {
    icon: Coins,
    title: "Monthly credits",
    description: "Every plan ships with a monthly credit grant and keeps top-ups separate from the core allowance.",
  },
  {
    icon: Gauge,
    title: "Priority execution",
    description: "Free workspaces stay on the normal queue. Paid plans move critical replay jobs to priority execution.",
  },
  {
    icon: Layers3,
    title: "Shared control plane",
    description: "Upgrade from solo debugging to team-wide reliability programs with policy, security, and governance surfaces.",
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-black">
        <div className="site-container py-20 md:py-28">
          <div className="max-w-5xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">Pricing</p>
            <h1 className="page-hero-title mt-5 max-w-4xl text-white">
              Credits for every replay, mutation, and reliability check.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-neutral-400 md:text-xl">
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

          <div className="mt-16 grid gap-px overflow-hidden rounded-[28px] bg-white/8 lg:grid-cols-3">
            {valuePoints.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.title} className="bg-black px-6 py-8 md:px-8">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                    <Icon className="h-5 w-5 text-white/50" />
                  </div>
                  <h2 className="mt-6 text-xl font-semibold text-white">{point.title}</h2>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-neutral-400">
                    {point.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Operation costs */}
      <section className="bg-neutral-950">
        <div className="site-container py-16 md:py-24">
          <div className="max-w-3xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">Operation costs</p>
            <h2 className="section-heading mt-4 text-white">
              Predictable cost per action.
            </h2>
            <p className="mt-4 text-base leading-7 text-neutral-400 md:text-lg">
              Credits are consumed only when work is executed. That makes spend easier to reason
              about than seat-heavy pricing while still matching actual reliability activity.
            </p>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden rounded-[28px] bg-white/8 md:grid-cols-3">
            {operationCosts.map((item) => (
              <div key={item.label} className="bg-neutral-950 px-6 py-7 md:px-8">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/40">{item.label}</p>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-white">
                  {item.credits}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tier sections */}
      {pricingTiers.map((tier) => (
        <section key={tier.tier} className="bg-black">
          <div className="site-container grid gap-10 py-16 md:py-24 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm uppercase tracking-[0.18em] text-neutral-500">{tier.name}</p>
                {tier.featured ? (
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-neutral-300">
                    Most popular
                  </span>
                ) : null}
              </div>
              <div className="mt-5 flex flex-wrap items-end gap-3">
                <h2 className="text-5xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                  {tier.price}
                </h2>
                <span className="pb-2 text-sm text-neutral-400">{tier.interval}</span>
              </div>
              <p className="mt-5 max-w-xl text-lg leading-8 text-neutral-400">{tier.description}</p>

              <div className="mt-10 flex flex-wrap gap-3">
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-neutral-300">
                  <Coins className="mr-2 h-4 w-4 text-white/40" />
                  {tier.monthlyCredits}
                </span>
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium capitalize text-neutral-300">
                  <Zap className="mr-2 h-4 w-4 text-white/40" />
                  {tier.queuePriority} queue
                </span>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-7 md:p-8">
              <div className="space-y-3">
                {tier.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <div
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
                      style={{ borderColor: "rgba(0,229,204,0.25)", background: "rgba(0,229,204,0.06)" }}
                    >
                      <Check className="h-3.5 w-3.5" style={{ color: "var(--accent-teal)" }} />
                    </div>
                    <p className="text-sm leading-6 text-neutral-300">{feature}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <a
                  href={tier.href}
                  className="teal-glow-btn inline-flex h-11 items-center justify-center gap-2 rounded-full border px-6 text-sm font-semibold text-white"
                  style={{
                    borderColor: "rgba(0,229,204,0.35)",
                    background: "rgba(0,229,204,0.08)",
                  }}
                >
                  {tier.cta}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Enterprise CTA */}
      <section className="bg-neutral-950">
        <div className="site-container py-16 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">Need a custom rollout?</p>
              <h2 className="section-heading mt-4 text-white">
                Start breaking your AI agents safely.
              </h2>
            </div>
            <div>
              <p className="max-w-2xl text-base leading-7 text-neutral-400 md:text-lg">
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
    </>
  );
}
