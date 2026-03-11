import type { Metadata } from "next";

import { PricingTable } from "@/components/sections/pricing-table";
import { WaitlistForm } from "@/components/waitlist-form";
import { Card, CardContent } from "@/components/ui/card";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing",
  description:
    "Simple pricing for Sepurux with Starter, Team, and Enterprise tiers for AI agent reliability programs.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <div className="site-container py-16 md:py-24">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.16em] text-primary">Pricing</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Transparent plans for every reliability stage.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Start with replay diagnostics and scale into policy, security, and governance surfaces as your agent footprint grows.
        </p>
      </header>

      <section className="mt-12">
        <PricingTable />
      </section>

      <section id="waitlist" className="mt-16">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-2xl font-semibold text-foreground">Need a custom plan?</h2>
            <p className="mt-3 text-muted-foreground">
              Tell us your volume, deployment model, and security requirements. We will tailor an enterprise rollout.
            </p>
            <div className="mt-6">
              <WaitlistForm />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
