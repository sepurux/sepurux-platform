import { Button } from "@/components/ui/button";
import { buildAppAuthHref } from "@/lib/site";

export function FinalCtaSection() {
  return (
    <section className="site-container mt-24 pb-8 sm:mt-28">
      <div className="relative overflow-hidden rounded-[32px] border border-neutral-900 bg-neutral-950 px-6 py-12 backdrop-blur-xl md:px-10 md:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(37,99,235,0.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(37,99,235,0.12),transparent_26%)]" />
        <p className="relative section-kicker">Start now</p>
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white md:text-5xl">
          Start breaking your AI agents safely.
        </h2>
        <p className="relative mt-5 max-w-2xl text-base leading-8 text-neutral-500">
          Push changes faster with deterministic replays, mutation stress tests, and policy-aware CI
          checks.
        </p>
        <div className="relative mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <a href={buildAppAuthHref({ mode: "access", intent: "signup" })}>Get Started</a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={buildAppAuthHref({ mode: "demo" })}>View Demo</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
