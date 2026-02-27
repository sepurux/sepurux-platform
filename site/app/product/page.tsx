import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Product",
  description:
    "Deep dive into Crash Lab replay, mutation packs, counterfactuals, policy packs, and CI gate workflows.",
  path: "/product",
});

const modules = [
  {
    title: "Replay",
    description:
      "Deterministic timeline reconstruction for every attempt. Pinpoint first failure tool and event index.",
    bullets: ["Tool call ordering", "Failure reason capture", "Run inspector compatible artifacts"],
  },
  {
    title: "Mutations",
    description:
      "Seeded chaos scenarios with schema drift, fault injection, and poisoning to stress brittle agent behavior.",
    bullets: ["Weighted mutation packs", "Deterministic seeds", "Per-attempt mutation trace"],
  },
  {
    title: "Counterfactuals",
    description:
      "What-if replay strategies to evaluate whether remediation options would have prevented failure.",
    bullets: ["Retry policy simulation", "Policy gate alternatives", "Diff snapshots"],
  },
  {
    title: "Policy Packs",
    description:
      "Guardrails for irreversible actions with allow/deny/require_approval decisions and event-level records.",
    bullets: ["Tool pattern rules", "Approval token checks", "Policy events per run"],
  },
  {
    title: "CI Gate",
    description:
      "Create CI runs and block pull requests when pass-rate or unsafe thresholds are violated.",
    bullets: ["Strict pass/fail decisions", "Threshold-aware polling", "GitHub Action integration"],
  },
];

export default function ProductPage() {
  return (
    <div className="site-container py-16 md:py-24">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.16em] text-primary">Product</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Reliability workflow for production AI agents.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Crash Lab helps platform teams replay real traces, inject controlled chaos, evaluate outcomes,
          and gate merges when agent quality regresses.
        </p>
      </header>

      <section className="mt-12 grid gap-4 lg:grid-cols-2">
        {modules.map((module) => (
          <Card key={module.title}>
            <CardHeader>
              <CardTitle>{module.title}</CardTitle>
              <CardDescription>{module.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {module.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-16 rounded-xl border border-border/80 bg-card/70 p-6 md:p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">System flow</h2>
        <p className="mt-3 text-muted-foreground">
          Trace intake feeds campaign runs. Worker replays each mutation attempt, policy checks are applied,
          analytics summarize failures, and CI decides pass/fail for release confidence.
        </p>
        <pre className="mt-6 overflow-x-auto rounded-md border border-border/70 bg-background/70 p-4 text-xs text-primary">
          <code>{`trace -> run -> attempts -> policy_events -> analytics -> ci_decision`}</code>
        </pre>
      </section>
    </div>
  );
}
