import Link from "next/link";

import { Button } from "@/components/ui/button";

export function FinalCtaSection() {
  return (
    <section className="site-container mt-24 pb-6">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card px-6 py-10 md:px-10 md:py-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.22),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.12),transparent_38%)]" />
        <p className="relative text-xs uppercase tracking-[0.16em] text-secondary">Start now</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Start Breaking Your Agents Safely
        </h2>
        <p className="relative mt-4 max-w-2xl text-muted-foreground">
          Push changes faster with deterministic replays, mutation stress tests, and policy-aware CI
          checks.
        </p>
        <div className="relative mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/product">Get Started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/docs">View Docs</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
