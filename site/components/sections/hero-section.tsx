"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScreenshotPlaceholder } from "@/components/shared/screenshot-placeholder";

const logos = ["Northstar", "Helios", "Cresta", "Signal", "Orbit", "Vector"];

export function HeroSection() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <section className="site-container pt-16 md:pt-24">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Badge variant="outline" className="mb-5 border-primary/30 text-primary">
            Used by platform teams
          </Badge>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
            Chaos engineering for AI agents.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Replay + mutate + score tool-using agents before they ship. Block regressions in CI.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <a href="#waitlist">Request access</a>
            </Button>
            <Button size="lg" variant="outline" onClick={() => setShowDemo(true)}>
              <PlayCircle className="h-4 w-4" /> View demo
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
          <ScreenshotPlaceholder title="Run Inspector" className="-rotate-1" />
          <ScreenshotPlaceholder title="Policy + CI Gate" className="rotate-1" />
        </div>
      </div>

      {showDemo ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-panel">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Demo Video (Placeholder)</h3>
              <button
                className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowDemo(false)}
              >
                Close
              </button>
            </div>
            <div className="faint-grid flex h-72 items-center justify-center rounded-lg border border-border/70 bg-muted/20 text-sm text-muted-foreground">
              Product walkthrough video goes here.
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
