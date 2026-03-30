"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { pricingTiers, type PricingTierDefinition } from "@/lib/pricing";

const ANNUAL_DISCOUNT_RATE = 0.2;

type BillingMode = "monthly" | "yearly";

type TierTheme = {
  cardClassName: string;
  badgeClassName: string;
  chipClassName: string;
  metaClassName: string;
  headingClassName: string;
  bodyClassName: string;
  panelClassName: string;
  listClassName: string;
  buttonClassName: string;
  buttonStyle?: CSSProperties;
};

const billingOptions: { mode: BillingMode; label: string }[] = [
  { mode: "monthly", label: "Month" },
  { mode: "yearly", label: "Annual" },
];

const compactPlanCopy: Record<
  PricingTierDefinition["tier"],
  { audience: string; description: string; features: string[] }
> = {
  free: {
    audience: "Solo validation",
    description: "One-time credits for early reliability workflows.",
    features: [
      "Normal execution queue",
      "Credit top-ups available",
      "Trace, campaign, and run workflows",
      "Upgrade when you need governance controls",
    ],
  },
  pro: {
    audience: "Small AI teams",
    description: "Recurring credits and guardrails for individual teams.",
    features: [
      "Priority execution queue",
      "Monthly credits renew each cycle",
      "Policy and security configuration",
      "Trace, campaign, and run workflows",
    ],
  },
  team: {
    audience: "Shared teams",
    description: "Shared workspaces and automation for collaborative teams.",
    features: [
      "Invite and manage members",
      "Manage workspaces and projects",
      "Webhook integrations",
      "Priority queue with credit top-ups",
    ],
  },
  enterprise: {
    audience: "Large programs",
    description: "Audit visibility and governance for high-volume programs.",
    features: [
      "Full audit visibility",
      "Enterprise policy controls",
      "Workspace and member management",
      "Webhook integrations at scale",
    ],
  },
};

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

function themeForTier(tier: PricingTierDefinition): TierTheme {
  switch (tier.tier) {
    case "pro":
      return {
        cardClassName:
          "border-[rgba(var(--accent-rgb),0.34)] bg-[radial-gradient(circle_at_top,rgba(var(--accent-rgb),0.24),transparent_42%),linear-gradient(180deg,#382113_0%,#6a4123_44%,#f6ebdf_168%)] text-white shadow-[0_24px_64px_rgba(0,0,0,0.28)]",
        badgeClassName:
          "border border-white/20 bg-white/12 text-emerald-50",
        chipClassName:
          "border border-white/14 bg-white/10 text-emerald-50/88",
        metaClassName: "text-emerald-50/72",
        headingClassName: "text-white",
        bodyClassName: "text-emerald-50/76",
        panelClassName: "border border-white/12 bg-white/10",
        listClassName: "text-slate-100",
        buttonClassName: "border-transparent bg-[var(--color-accent)] text-white hover:brightness-110",
        buttonStyle: {
          boxShadow: "0 10px 24px rgba(var(--accent-rgb), 0.28)",
        },
      };
    case "team":
      return {
        cardClassName:
          "border-emerald-100 bg-[linear-gradient(180deg,#f6fbf6_0%,#ffffff_56%,#f1f8f2_100%)] shadow-[0_18px_40px_rgba(15,23,42,0.08)]",
        badgeClassName:
          "border border-emerald-100 bg-white text-emerald-700",
        chipClassName:
          "border border-emerald-100 bg-emerald-50 text-emerald-700",
        metaClassName: "text-slate-500",
        headingClassName: "text-slate-950",
        bodyClassName: "text-slate-600",
        panelClassName: "border border-slate-200 bg-white/80",
        listClassName: "text-slate-700",
        buttonClassName: "border-slate-200 bg-white text-slate-950 hover:border-emerald-200 hover:bg-emerald-50",
      };
    case "enterprise":
      return {
        cardClassName:
          "border-orange-100 bg-[linear-gradient(180deg,#fff8f1_0%,#ffffff_54%,#fff5ed_100%)] shadow-[0_18px_40px_rgba(15,23,42,0.08)]",
        badgeClassName:
          "border border-orange-100 bg-white text-orange-700",
        chipClassName:
          "border border-orange-100 bg-orange-50 text-orange-700",
        metaClassName: "text-slate-500",
        headingClassName: "text-slate-950",
        bodyClassName: "text-slate-600",
        panelClassName: "border border-slate-200 bg-white/80",
        listClassName: "text-slate-700",
        buttonClassName: "border-slate-200 bg-white text-slate-950 hover:border-orange-200 hover:bg-orange-50",
      };
    case "free":
    default:
      return {
        cardClassName:
          "border-stone-200 bg-[linear-gradient(180deg,#f7f5f1_0%,#ffffff_62%,#f8f6f2_100%)] shadow-[0_18px_40px_rgba(15,23,42,0.08)]",
        badgeClassName:
          "border border-stone-200 bg-white text-stone-700",
        chipClassName:
          "border border-stone-200 bg-stone-50 text-stone-700",
        metaClassName: "text-slate-500",
        headingClassName: "text-slate-950",
        bodyClassName: "text-slate-600",
        panelClassName: "border border-slate-200 bg-white/80",
        listClassName: "text-slate-700",
        buttonClassName: "border-slate-200 bg-white text-slate-950 hover:border-stone-300 hover:bg-stone-50",
      };
  }
}

function pricingForMode(tier: PricingTierDefinition, billingMode: BillingMode) {
  const monthlyPrice = parseUsdPrice(tier.price);

  if (monthlyPrice <= 0) {
    return {
      priceLabel: tier.price,
      cadenceLabel: "per user / month",
      subline: "free forever",
    };
  }

  if (billingMode === "monthly") {
    return {
      priceLabel: tier.price,
      cadenceLabel: "per user / month",
      subline: "billed monthly",
    };
  }

  const annualTotal = Math.round(monthlyPrice * 12 * (1 - ANNUAL_DISCOUNT_RATE));
  const annualMonthlyEquivalent = Math.round(monthlyPrice * (1 - ANNUAL_DISCOUNT_RATE));

  return {
    priceLabel: formatUsd(annualMonthlyEquivalent),
    cadenceLabel: "per user / month",
    subline: `billed annually as ${formatUsd(annualTotal)} / user`,
  };
}

export function PricingComparisonSection() {
  const [billingMode, setBillingMode] = useState<BillingMode>("monthly");
  const [selectedTier, setSelectedTier] = useState<PricingTierDefinition["tier"]>("pro");
  const selectedPlan =
    pricingTiers.find((tier) => tier.tier === selectedTier) ?? pricingTiers.find((tier) => tier.tier === "pro") ?? pricingTiers[0];
  const selectedTheme = themeForTier(selectedPlan);
  const selectedPricing = pricingForMode(selectedPlan, billingMode);
  const selectedCapacity = capacityFromCredits(selectedPlan.monthlyCredits);
  const selectedPlanIndex = pricingTiers.findIndex((tier) => tier.tier === selectedPlan.tier);
  const inheritedFrom = selectedPlanIndex > 0 ? pricingTiers[selectedPlanIndex - 1]?.name : null;
  const selectedCopy = compactPlanCopy[selectedPlan.tier];
  const accentGlow = {
    free: "radial-gradient(circle at top right, rgba(245, 158, 11, 0.14), transparent 38%)",
    pro: "radial-gradient(circle at top right, rgba(var(--accent-rgb), 0.22), transparent 40%)",
    team: "radial-gradient(circle at top right, rgba(var(--warm-rgb), 0.18), transparent 40%)",
    enterprise: "radial-gradient(circle at top right, rgba(var(--accent-rgb), 0.12), transparent 42%)",
  }[selectedPlan.tier];
  const capacitySummary = selectedCapacity
    ? `${selectedCapacity.traceReplays.toLocaleString()} trace replays`
    : "Starter credit pool";
  const queueLabel = selectedPlan.queuePriority === "priority" ? "Priority queue" : "Standard queue";

  return (
    <section className="ink-section-muted relative overflow-hidden border-y border-white/10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[radial-gradient(circle_at_top,rgba(var(--accent-rgb),0.12),transparent_52%)]" />
      <div className="site-container relative py-14 md:py-20">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="section-kicker ink-kicker">Plan comparison</p>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Pricing shaped for validation, team operations, and governed scale.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
              Compare tier shape, credit volume, and execution priority. Select a plan to inspect the operational details without turning the page into a pricing wall.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Billing view
            </p>
            <div className="inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/8 p-1 backdrop-blur-sm">
              {billingOptions.map(({ mode, label }) => {
                const isActive = billingMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setBillingMode(mode)}
                    aria-label={mode === "monthly" ? "Monthly billing" : "Yearly billing"}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition-all sm:px-4",
                      isActive ? "bg-white text-slate-950 shadow-sm" : "text-slate-300 hover:text-white"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
              <span
                className="rounded-full px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                style={{
                  border: "1px solid rgba(var(--accent-rgb), 0.24)",
                  background: "rgba(var(--accent-rgb), 0.10)",
                  color: "#d1fae5",
                }}
              >
                -20%
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pricingTiers.map((tier) => {
            const pricing = pricingForMode(tier, billingMode);
            const summary = compactPlanCopy[tier.tier];
            const isSelected = tier.tier === selectedPlan.tier;

            return (
              <button
                key={tier.tier}
                type="button"
                onClick={() => setSelectedTier(tier.tier)}
                aria-pressed={isSelected}
                className={cn(
                  "rounded-[26px] border px-5 py-5 text-left transition-all duration-200",
                  isSelected
                    ? "border-white/16 bg-white/10 shadow-[0_16px_36px_rgba(0,0,0,0.16)]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.06]"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                      {tier.name}
                    </p>
                    <p className="mt-3 text-lg font-semibold tracking-[0.04em] text-white">
                      {summary.audience}
                    </p>
                  </div>
                  {tier.featured ? (
                    <span className="rounded-full border border-[rgba(var(--warm-rgb),0.24)] bg-[rgba(var(--warm-rgb),0.12)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-50">
                      Popular
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 flex items-end gap-2">
                  <span className="text-3xl font-semibold tracking-[-0.05em] text-white">
                    {pricing.priceLabel}
                  </span>
                  <span className="pb-1 text-xs text-slate-400">{pricing.cadenceLabel}</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200">
                    {tier.monthlyCredits}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200">
                    {tier.queuePriority === "priority" ? "Priority queue" : "Standard queue"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <article className="relative mt-6 overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] shadow-[0_24px_64px_rgba(0,0,0,0.22)] backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 opacity-90" style={{ background: accentGlow }} />

          <div className="relative grid gap-8 p-6 md:p-8 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] xl:gap-10">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                  {selectedPlan.name}
                </p>
                <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]", selectedTheme.badgeClassName)}>
                  {queueLabel}
                </span>
                {selectedPlan.featured ? (
                  <span className="rounded-full border border-[rgba(var(--warm-rgb),0.24)] bg-[rgba(var(--warm-rgb),0.12)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-50">
                    Most popular
                  </span>
                ) : null}
              </div>

              <h3 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                {selectedCopy.audience}
              </h3>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-200">
                {selectedPlan.description}
              </p>

              <div className="mt-8 flex items-end gap-3">
                <p className="text-[3.3rem] font-semibold tracking-[-0.06em] text-white md:text-[3.7rem]">
                  {selectedPricing.priceLabel}
                </p>
                <span className="pb-2 text-sm text-slate-300">{selectedPricing.cadenceLabel}</span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{selectedPricing.subline}</p>

              <a
                href={selectedPlan.href}
                className={cn(
                  "mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border px-6 text-sm font-semibold transition-all sm:w-auto sm:min-w-[12rem]",
                  selectedTheme.buttonClassName
                )}
                style={selectedTheme.buttonStyle}
              >
                {selectedPlan.cta}
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Credits
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">{selectedPlan.monthlyCredits}</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Queue
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">{queueLabel}</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Capacity
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">{capacitySummary}</p>
                </div>
              </div>

              {inheritedFrom ? (
                <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Includes everything in {inheritedFrom}
                </p>
              ) : null}

              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {selectedCopy.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-100">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0"
                        style={{ color: selectedPlan.featured ? "#ffedd5" : "var(--color-accent)" }}
                      />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
