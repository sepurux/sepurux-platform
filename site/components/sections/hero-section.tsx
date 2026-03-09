import { PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScreenshotPlaceholder } from "@/components/shared/screenshot-placeholder";
import { siteConfig } from "@/lib/site";

const logos = ["Northstar", "Helios", "Cresta", "Signal", "Orbit", "Vector"];

export function HeroSection() {
  const requestAccessHref = `${siteConfig.appUrl}/auth?mode=access&utm_source=site&utm_medium=hero&utm_campaign=request-access`;
  const viewDemoHref = `${siteConfig.appUrl}/auth?mode=demo&preview=envato&utm_source=site&utm_medium=hero&utm_campaign=view-demo`;

  return (
    <section className="site-container pt-16 md:pt-24">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Badge variant="outline" className="mb-5 border-primary/30 text-primary">
            Used by platform teams
          </Badge>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
            <span className="block">Sepurux</span>
            <span className="block text-3xl md:text-5xl">Reliability infrastructure for AI agents</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Replay workflows, inject failures, enforce policies, and block regressions before production.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <a href={requestAccessHref}>Request access</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={viewDemoHref}>
                <PlayCircle className="h-4 w-4" /> View demo
              </a>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-2">
            {logos.map((logo) => (
              <span
                key={logo}
                className="rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground"
              >
                {logo}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <ScreenshotPlaceholder
            title="Run Inspector"
            className="-rotate-1"
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
            className="rotate-1"
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
