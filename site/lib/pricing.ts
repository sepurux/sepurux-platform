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
    description: "For individual builders validating agent reliability with one-time signup credits.",
    monthlyCredits: "100 signup credits (one-time)",
    queuePriority: "normal",
    previewHighlights: ["100 one-time signup credits", "Normal queue", "No member invites"],
    features: [
      "100 one-time signup credits",
      "No monthly renewal credits on Free",
      "Normal execution queue",
      "Credit top-ups available",
      "Trace, campaign, and run workflows",
      "Member invites require Team or Enterprise",
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
    description: "For continuous agent QA workflows that need recurring credits and priority execution.",
    monthlyCredits: "2,000 credits / month",
    queuePriority: "priority",
    previewHighlights: ["2,000 monthly credits", "Priority queue", "No member invites"],
    features: [
      "2,000 monthly credits",
      "Priority execution queue",
      "Monthly credits renew each billing cycle",
      "Credit top-ups",
      "Trace, campaign, and run workflows",
      "Member invites require Team or Enterprise",
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
    description: "For collaborative reliability teams that need shared workspace access and member invites.",
    monthlyCredits: "10,000 credits / month",
    queuePriority: "priority",
    previewHighlights: ["10,000 monthly credits", "Priority queue", "Member invites enabled"],
    features: [
      "10,000 monthly credits",
      "Priority execution queue",
      "Monthly credits renew each billing cycle",
      "Credit top-ups",
      "Invite and manage workspace members",
      "Shared workspace collaboration",
    ],
    cta: "Book a demo",
    href: "/book-demo",
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    price: "$999",
    interval: "/month",
    description: "For high-volume reliability programs that need the enterprise workspace tier.",
    monthlyCredits: "50,000 credits / month",
    queuePriority: "priority",
    previewHighlights: ["50,000 monthly credits", "Priority queue", "Member invites enabled"],
    features: [
      "50,000 monthly credits",
      "Priority execution queue",
      "Monthly credits renew each billing cycle",
      "Credit top-ups",
      "Invite and manage workspace members",
      "Enterprise workspace tier",
    ],
    cta: "Contact sales",
    href: "/book-demo",
  },
];
