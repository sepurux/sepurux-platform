import { buildAppAuthHref } from "@/lib/site";

export type PricingTierDefinition = {
  tier: "free" | "pro" | "team" | "enterprise";
  name: string;
  price: string;
  interval: string;
  description: string;
  monthlyCredits: string;
  queuePriority: "normal" | "priority";
  previewHighlights: string[];
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
};

export const pricingTiers: PricingTierDefinition[] = [
  {
    tier: "free",
    name: "Free",
    price: "$0",
    interval: "/month",
    description: "For individual builders validating one agent loop before it reaches production.",
    monthlyCredits: "250 credits / month",
    queuePriority: "normal",
    previewHighlights: ["250 monthly credits", "Normal queue", "Core replay diagnostics"],
    features: [
      "250 monthly credits",
      "Normal execution queue",
      "Replay traces and run reports",
      "Core mutation packs",
      "Single workspace",
      "7-day run history",
    ],
    cta: "Get started",
    href: buildAppAuthHref({
      mode: "access",
      intent: "signup",
      plan: "starter",
      utmSource: "site",
      utmMedium: "pricing",
      utmCampaign: "free",
    }),
  },
  {
    tier: "pro",
    name: "Pro",
    price: "$49",
    interval: "/month",
    description: "For engineers running serious agent QA every week and needing priority execution.",
    monthlyCredits: "2,000 credits / month",
    queuePriority: "priority",
    previewHighlights: ["2,000 monthly credits", "Priority queue", "Replay + campaigns"],
    features: [
      "2,000 monthly credits",
      "Priority execution queue",
      "Deterministic replay campaigns",
      "Trace replay + mutation campaigns",
      "Reliability score and failure reports",
      "Credit top-ups",
      "Fast-start onboarding",
    ],
    cta: "Book a demo",
    href: "/book-demo",
    featured: true,
  },
  {
    tier: "team",
    name: "Team",
    price: "$199",
    interval: "/month",
    description: "For platform teams coordinating agent releases, approvals, and shared reliability ownership.",
    monthlyCredits: "10,000 credits / month",
    queuePriority: "priority",
    previewHighlights: ["10,000 monthly credits", "Priority queue", "Shared workspace"],
    features: [
      "10,000 monthly credits",
      "Priority execution queue",
      "Shared team workspace",
      "Policy packs + approval gates",
      "Security insights and webhook routing",
      "Counterfactual fix reports",
      "Workspace collaboration",
    ],
    cta: "Book a demo",
    href: "/book-demo",
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    price: "Custom",
    interval: "",
    description: "For organizations with strict governance, isolated deployment requirements, and large agent traffic.",
    monthlyCredits: "50,000+ credits / month",
    queuePriority: "priority",
    previewHighlights: ["50,000+ monthly credits", "Priority queue", "Governance + deployment controls"],
    features: [
      "50,000+ monthly credits",
      "Priority execution queue",
      "Unlimited projects",
      "Audit log and governance controls",
      "Private network deployment",
      "SSO / advanced RBAC",
      "Security + support SLAs",
    ],
    cta: "Contact sales",
    href: "/book-demo",
  },
];
