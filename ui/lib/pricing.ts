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
    summary: "One-time signup credits with normal queue execution.",
    menuHighlights: ["Normal queue", "100 signup credits", "No member invites"],
  },
  {
    tier: "team",
    name: "Team",
    summary: "Recurring monthly credits, priority queue, and member invites.",
    menuHighlights: ["Priority queue", "Invite members", "Shared collaboration"],
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    summary: "Highest monthly credits with priority queue and member invites.",
    menuHighlights: ["Priority queue", "Invite members", "Enterprise tier"],
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
