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
    "Subscription and credit pricing for Sepurux. Free includes one-time signup credits, while paid plans add recurring monthly credits and priority execution.",
  path: "/pricing",
});

const operationCosts = [
  { label: "Trace replay", credits: "5 credits" },
  { label: "Mutation campaign", credits: "20 credits" },
  { label: "Large campaign", credits: "50 credits (>=50 attempts)" },
  { label: "Scheduled pack run", credits: "pack-specific cost (default 20)" },
];

const ANNUAL_DISCOUNT_RATE = 0.2;

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

function parseUsdPrice(value: string): number {
  const normalized = value.replaceAll(/[^0-9]/g, "");
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString()}`;
}

function capacityFromCredits(monthlyCredits: string) {
  const credits = Number.parseInt(monthlyCredits.replaceAll(/[^0-9]/g, ""), 10);
  if (!Number.isFinite(credits) || credits <= 0) {
    return null;
  }
  return {
    credits,
    traceReplays: Math.floor(credits / 5),
    campaigns: Math.floor(credits / 20),
    largeCampaigns: Math.floor(credits / 50),
  };
}

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

      {/* Tier comparison */}
      <section className="bg-black">
        <div className="site-container py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">Plan comparison</p>
            <h2 className="section-heading mt-4 text-white">Choose the best plan for your reliability workflow.</h2>
            <p className="mt-4 text-base leading-7 text-neutral-400 md:text-lg">
              Monthly credits refresh each billing cycle on paid tiers. Annual billing applies a 20% discount for
              equivalent monthly cost.
            </p>
            <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1">
              <span className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-black">
                Monthly
              </span>
              <span className="rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-300">
                Yearly
              </span>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                -20% off
              </span>
            </div>
          </div>

          <div className="mt-12 grid gap-4 xl:grid-cols-4">
            {pricingTiers.map((tier, index) => {
              const monthlyPrice = parseUsdPrice(tier.price);
              const annualTotal = Math.round(monthlyPrice * 12 * (1 - ANNUAL_DISCOUNT_RATE));
              const annualMonthlyEquivalent = Math.round(monthlyPrice * (1 - ANNUAL_DISCOUNT_RATE));
              const capacity = capacityFromCredits(tier.monthlyCredits);
              const inheritedFrom = index > 0 ? pricingTiers[index - 1]?.name : null;

              return (
                <div
                  key={tier.tier}
                  className={`relative flex h-full flex-col rounded-[22px] border p-6 ${
                    tier.featured
                      ? "border-[rgba(0,229,204,0.38)] bg-[rgba(0,229,204,0.06)]"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  {tier.featured ? (
                    <span className="absolute right-4 top-4 rounded-full border border-[rgba(0,229,204,0.35)] bg-[rgba(0,229,204,0.12)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-teal)]">
                      Most popular
                    </span>
                  ) : null}

                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">{tier.name}</p>
                  <p className="mt-3 text-sm leading-6 text-neutral-400">{tier.description}</p>

                  <div className="mt-5 flex items-end gap-2">
                    <p className="text-4xl font-semibold tracking-[-0.04em] text-white">{tier.price}</p>
                    <span className="pb-1 text-xs text-neutral-400">per user / month</span>
                  </div>
                  {monthlyPrice > 0 ? (
                    <p className="mt-1 text-xs text-neutral-400">
                      billed annually as {formatUsd(annualTotal)} ({formatUsd(annualMonthlyEquivalent)}/mo)
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-neutral-400">free forever</p>
                  )}

                  <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">Includes</p>
                    <p className="mt-2 text-sm font-medium text-white">{tier.monthlyCredits}</p>
                    {capacity ? (
                      <p className="mt-1 text-xs leading-5 text-neutral-400">
                        {capacity.credits.toLocaleString()} credits = {capacity.traceReplays.toLocaleString()} trace
                        replays or {capacity.campaigns.toLocaleString()} campaigns or{" "}
                        {capacity.largeCampaigns.toLocaleString()} large campaigns.
                      </p>
                    ) : null}
                  </div>

                  {inheritedFrom ? (
                    <p className="mt-4 text-xs text-neutral-500">Everything in {inheritedFrom} and...</p>
                  ) : null}

                  <ul className="mt-4 flex-1 space-y-2.5">
                    {tier.features.slice(0, 6).map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-neutral-300">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-teal)]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href={tier.href}
                    className="teal-glow-btn mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold text-white"
                    style={{
                      borderColor: tier.featured ? "rgba(0,229,204,0.45)" : "rgba(255,255,255,0.18)",
                      background: tier.featured ? "rgba(0,229,204,0.14)" : "rgba(255,255,255,0.06)",
                    }}
                  >
                    {tier.cta}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

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
