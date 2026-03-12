import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScreenshotPlaceholder } from "@/components/shared/screenshot-placeholder";

const logos = ["Northstar", "Helios", "Cresta", "Signal", "Orbit", "Vector"];

export function HeroSection() {
  return (
    <section className="site-container pt-14 md:pt-20">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Badge variant="outline" className="mb-5 border-info/30 bg-info/10 text-info">
            Used by platform teams
          </Badge>
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-6xl">
            <span className="block">Sepurux</span>
            <span className="block bg-gradient-to-r from-slate-100 via-blue-200 to-cyan-300 bg-clip-text text-3xl text-transparent md:text-5xl">
              Reliability infrastructure for AI agents
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Replay workflows, inject failures, enforce policies, and block regressions before production.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/book-demo">Book a demo</Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-2">
            {logos.map((logo) => (
              <span
                key={logo}
                className="rounded-full border border-border/80 bg-card/70 px-3 py-1 text-xs text-muted-foreground"
              >
                {logo}
              </span>
            ))}
          </div>
        </div>

        <div className="relative space-y-4">
          <div className="pointer-events-none absolute -left-8 -top-8 h-36 w-36 rounded-full bg-secondary/16 blur-3xl" />
          <ScreenshotPlaceholder
            title="Run Inspector"
            className="-rotate-[1.8deg]"
            command="curl -s http://localhost:8000/v1/runs/<run_id>/stats"
            animateCommand
            terminalLabel="run-inspector.sh"
            resultLines={[
              "status: done",
              "pass_rate: 0.92",
              "first_failure_tool: jira.create_issue",
            ]}
          />
          <ScreenshotPlaceholder
            title="Policy + CI Gate"
            className="rotate-[1.6deg]"
            command="curl -s -X POST http://localhost:8000/v1/ci/runs"
            animateCommand
            terminalLabel="policy-ci-gate.sh"
            resultLines={[
              "decision: fail",
              "reason: policy_requires_approval",
              "blocked_tool: payments.refund",
            ]}
          />
        </div>
      </div>
    </section>
  );
}
