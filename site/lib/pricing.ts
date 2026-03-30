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
    description: "For solo builders validating reliability workflows with one-time signup credits.",
    monthlyCredits: "100 signup credits (one-time)",
    queuePriority: "normal",
    previewHighlights: ["100 one-time signup credits", "Normal queue", "Core reliability workflows"],
    features: [
      "100 one-time signup credits",
      "No monthly renewal credits on Free",
      "Normal execution queue",
      "Credit top-ups available",
      "Trace, campaign, and run workflows",
      "Policy/security controls, webhooks, and audit require paid plans",
      "Member invites and workspace expansion require Team or Enterprise",
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
    description: "For individual AI teams that need recurring credits, priority queueing, and guardrails.",
    monthlyCredits: "500 credits / month",
    queuePriority: "priority",
    previewHighlights: ["500 monthly credits", "Priority queue", "Policy + security controls"],
    features: [
      "500 monthly credits",
      "Priority execution queue",
      "Monthly credits renew each billing cycle",
      "Credit top-ups",
      "Trace, campaign, and run workflows",
      "Policy packs and security configuration",
      "Member invites, webhooks, and audit require higher tiers",
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
    description: "For collaborative reliability teams that need shared workspaces and automation hooks.",
    monthlyCredits: "2,500 credits / month",
    queuePriority: "priority",
    previewHighlights: ["2,500 monthly credits", "Priority queue", "Invites + webhooks"],
    features: [
      "2,500 monthly credits",
      "Priority execution queue",
      "Monthly credits renew each billing cycle",
      "Credit top-ups",
      "Invite and manage workspace members",
      "Add and manage workspaces/projects",
      "Webhook integrations",
      "Policy and security controls",
      "Audit visibility reserved for Enterprise",
    ],
    cta: "Book a demo",
    href: "/book-demo",
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    price: "$999",
    interval: "/month",
    description: "For high-volume programs that need audit visibility and enterprise governance controls.",
    monthlyCredits: "10,000 credits / month",
    queuePriority: "priority",
    previewHighlights: ["10,000 monthly credits", "Priority queue", "Audit + governance"],
    features: [
      "10,000 monthly credits",
      "Priority execution queue",
      "Monthly credits renew each billing cycle",
      "Credit top-ups",
      "Invite and manage workspace members",
      "Add and manage workspaces/projects",
      "Webhook integrations and full audit visibility",
      "Policy/security controls at enterprise scale",
    ],
    cta: "Contact sales",
    href: "/book-demo",
  },
];
