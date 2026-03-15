import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pricingTiers } from "@/lib/pricing";

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {pricingTiers.map((tier) => (
          <Card key={tier.tier} className={tier.featured ? "border-primary/40" : undefined}>
            <CardHeader>
              <div className="mb-1 flex items-center justify-between">
                <CardTitle>{tier.name}</CardTitle>
                {tier.featured ? <Badge>Most popular</Badge> : null}
              </div>
              <CardDescription className="text-xl font-semibold text-foreground">
                {tier.price}
                <span className="ml-1 text-sm font-normal text-muted-foreground">{tier.interval}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {tier.previewHighlights.map((item) => (
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
