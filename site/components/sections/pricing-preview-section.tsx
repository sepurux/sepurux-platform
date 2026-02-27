import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const tiers = [
  {
    name: "Starter",
    price: "$99/mo",
    highlights: ["1 project", "Basic mutation packs", "Email support"],
  },
  {
    name: "Team",
    price: "$599/mo",
    highlights: ["10 projects", "Policy packs + CI gate", "Run inspector analytics"],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Contact us",
    highlights: ["Unlimited projects", "SSO + advanced controls", "Priority support"],
  },
];

export function PricingPreviewSection() {
  return (
    <section className="site-container mt-24">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-primary">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Start small, scale reliability fast.
          </h2>
        </div>
        <Button asChild variant="outline">
          <Link href="/pricing">View full pricing</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map((tier) => (
          <Card key={tier.name} className={tier.featured ? "border-primary/40" : undefined}>
            <CardHeader>
              <div className="mb-1 flex items-center justify-between">
                <CardTitle>{tier.name}</CardTitle>
                {tier.featured ? <Badge>Most popular</Badge> : null}
              </div>
              <CardDescription className="text-xl font-semibold text-foreground">
                {tier.price}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {tier.highlights.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
