import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { pricingTiers } from "@/lib/pricing";

export function PricingTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {pricingTiers.map((tier) => (
        <Card
          key={tier.tier}
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
            <Button asChild className="w-full" variant={tier.featured ? "default" : "outline"}>
              <a href={tier.href}>{tier.cta}</a>
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
