export type PricingTier = "starter" | "team" | "enterprise";

export type PricingTierDefinition = {
  tier: PricingTier;
  name: string;
  summary: string;
  menuHighlights: string[];
};

export const pricingTierDefinitions: PricingTierDefinition[] = [
  {
    tier: "starter",
    name: "Starter",
    summary: "Replay, mutation basics, and run history for one agent stack.",
    menuHighlights: ["Traces", "Campaigns", "Runs", "Reports", "Mutation Packs"],
  },
  {
    tier: "team",
    name: "Team",
    summary: "Adds policies, security insights, and webhook automation.",
    menuHighlights: ["Policies", "Security", "Webhooks"],
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    summary: "Unlocks governance surfaces and enterprise operating controls.",
    menuHighlights: ["Audit", "Advanced controls", "Support"],
  },
];

export function isPricingTier(value: string | null | undefined): value is PricingTier {
  return value === "starter" || value === "team" || value === "enterprise";
}

export function getPricingTierDefinition(value: string | null | undefined) {
  return (
    pricingTierDefinitions.find((entry) => entry.tier === value) ?? pricingTierDefinitions[1]
  );
}
