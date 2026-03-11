import { buildAppAuthHref, type PricingTier } from "@/lib/site";

export type PricingTierDefinition = {
  tier: PricingTier;
  name: string;
  price: string;
  interval: string;
  description: string;
  previewHighlights: string[];
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
};

export const pricingTiers: PricingTierDefinition[] = [
  {
    tier: "starter",
    name: "Starter",
    price: "$99",
    interval: "/month",
    description: "For small teams validating one agent stack.",
    previewHighlights: ["1 project", "Basic mutation packs", "Email support"],
    features: [
      "1 project / 2 seats",
      "Deterministic replay campaigns",
      "Basic mutation packs",
      "Traces, runs, reports, and settings",
      "7-day run history",
    ],
    cta: "Get started",
    href: buildAppAuthHref({
      mode: "access",
      intent: "signup",
      plan: "starter",
      utmSource: "site",
      utmMedium: "pricing",
      utmCampaign: "starter",
    }),
  },
  {
    tier: "team",
    name: "Team",
    price: "$599",
    interval: "/month",
    description: "For platform teams shipping agent updates weekly.",
    previewHighlights: ["10 projects", "Policy packs + CI gate", "Run inspector analytics"],
    features: [
      "10 projects / 25 seats",
      "Policy packs + approval gates",
      "GitHub PR gate integration",
      "Security insights and webhook routing",
      "Counterfactual fix reports",
    ],
    cta: "Start trial",
    href: buildAppAuthHref({
      mode: "access",
      intent: "signup",
      plan: "team",
      utmSource: "site",
      utmMedium: "pricing",
      utmCampaign: "team",
    }),
    featured: true,
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    price: "Custom",
    interval: "",
    description: "For organizations with strict governance and scale.",
    previewHighlights: ["Unlimited projects", "Audit + governance", "Priority support"],
    features: [
      "Unlimited projects",
      "Audit log and governance controls",
      "Private network deployment",
      "SSO / advanced RBAC",
      "Security + support SLAs",
    ],
    cta: "Request access",
    href: buildAppAuthHref({
      mode: "access",
      intent: "signup",
      plan: "enterprise",
      utmSource: "site",
      utmMedium: "pricing",
      utmCampaign: "enterprise",
    }),
  },
];
