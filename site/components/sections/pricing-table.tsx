import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const tiers = [
  {
    name: "Starter",
    price: "$99",
    interval: "/month",
    description: "For small teams validating one agent stack.",
    features: [
      "1 project / 2 seats",
      "Deterministic replay campaigns",
      "Basic mutation packs",
      "7-day run history",
    ],
    cta: "Get started",
  },
  {
    name: "Team",
    price: "$599",
    interval: "/month",
    description: "For platform teams shipping agent updates weekly.",
    features: [
      "10 projects / 25 seats",
      "Policy packs + approval gates",
      "GitHub PR gate integration",
      "Counterfactual fix reports",
    ],
    cta: "Start trial",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    interval: "",
    description: "For organizations with strict governance and scale.",
    features: [
      "Unlimited projects",
      "Private network deployment",
      "SSO / RBAC roadmap",
      "Security + support SLAs",
    ],
    cta: "Contact us",
  },
];

export function PricingTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {tiers.map((tier) => (
        <Card
          key={tier.name}
          className={tier.featured ? "border-primary/40 bg-primary/[0.08]" : undefined}
        >
          <CardHeader>
            <div className="mb-2 flex items-center justify-between">
              <CardTitle>{tier.name}</CardTitle>
              {tier.featured ? <Badge>Best value</Badge> : null}
            </div>
            <CardDescription>{tier.description}</CardDescription>
            <p className="mt-3 text-3xl font-semibold text-foreground">
              {tier.price}
              <span className="ml-1 text-sm font-normal text-muted-foreground">{tier.interval}</span>
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant={tier.featured ? "default" : "outline"}>
              {tier.cta}
            </Button>
          </CardFooter>
        </Card>
      ))}
      {!compact ? (
        <p className="lg:col-span-3 mt-2 text-xs text-muted-foreground">
          Pricing shown in USD. SOC2, DPA, and deployment options available on enterprise plans.
        </p>
      ) : null}
    </div>
  );
}
