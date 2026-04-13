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
    description: "For solo builders debugging a handful of traces before they need persistence.",
    monthlyCredits: "100 analyses (one-time)",
    queuePriority: "normal",
    previewHighlights: ["100 one-time analyses", "Normal queue", "Core debugger workflows"],
    features: [
      "100 one-time analyses",
      "No monthly renewal on Free",
      "Normal execution queue",
      "Saved traces available later",
      "Trace debugging, replay, and compare workflows",
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
    description: "For individual AI teams that need recurring analyses, saved traces, and replay.",
    monthlyCredits: "500 analyses / month",
    queuePriority: "priority",
    previewHighlights: ["500 monthly analyses", "Priority queue", "Policy + security controls"],
    features: [
      "500 monthly analyses",
      "Priority execution queue",
      "Saved traces, replay, and compare runs",
      "Continuous checks",
      "Trace, campaign, and test workflows",
      "Policy packs and security configuration",
      "Member invites, webhooks, and audit require higher tiers",
    ],
    cta: "Join waitlist",
    href: "/waitlist",
    featured: true,
  },
  {
    tier: "team",
    name: "Team",
    price: "$199",
    interval: "/month",
    description: "For collaborative reliability teams that need shared workspaces and automation hooks.",
    monthlyCredits: "2,500 analyses / month",
    queuePriority: "priority",
    previewHighlights: ["2,500 monthly analyses", "Priority queue", "Invites + webhooks"],
    features: [
      "2,500 monthly analyses",
      "Priority execution queue",
      "Continuous checks",
      "Saved traces and replay history",
      "Invite and manage workspace members",
      "Add and manage workspaces/projects",
      "Webhook integrations",
      "Policy and security controls",
      "Audit visibility reserved for Enterprise",
    ],
    cta: "Join waitlist",
    href: "/waitlist",
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    price: "$999",
    interval: "/month",
    description: "For high-volume programs that need audit visibility and enterprise governance controls.",
    monthlyCredits: "10,000 analyses / month",
    queuePriority: "priority",
    previewHighlights: ["10,000 monthly analyses", "Priority queue", "Audit + governance"],
    features: [
      "10,000 monthly analyses",
      "Priority execution queue",
      "Continuous checks and pre-release testing",
      "Mutation testing at scale",
      "Invite and manage workspace members",
      "Add and manage workspaces/projects",
      "Webhook integrations and full audit visibility",
      "Policy/security controls at enterprise scale",
    ],
    cta: "Join waitlist",
    href: "/waitlist",
  },
];
