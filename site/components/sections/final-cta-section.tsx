import { Button } from "@/components/ui/button";
import { buildAppAuthHref } from "@/lib/site";

export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden bg-black py-28 sm:py-36">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(255,255,255,0.07),transparent)]" />
      <div className="site-container text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">Start now</p>
        <h2 className="mx-auto mt-5 max-w-3xl font-display text-[clamp(2rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-white">
          Start breaking your AI agents safely.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-neutral-400">
          Push changes faster with deterministic replays, mutation stress tests, and policy-aware CI checks.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
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
