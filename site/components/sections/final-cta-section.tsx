import { Button } from "@/components/ui/button";

export function FinalCtaSection() {
  return (
    <section id="waitlist" className="site-container mt-24 pb-6">
      <div className="rounded-2xl border border-primary/30 bg-primary/10 px-6 py-10 md:px-10 md:py-14">
        <p className="text-xs uppercase tracking-[0.16em] text-primary">Start with confidence</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Ship agent changes without crossing your fingers.
        </h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Join the waitlist to get early access to replay diagnostics, mutation packs, policy packs,
          and CI gates.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <a href="/pricing">Request access</a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="/docs">Read docs</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
