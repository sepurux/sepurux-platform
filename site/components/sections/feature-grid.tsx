import { Binary, Bug, ClipboardList, GitPullRequestArrow, LockKeyhole, RotateCcw } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: RotateCcw,
    title: "Deterministic Replays",
    description: "Reconstruct the exact tool sequence and isolate regressions with confidence.",
  },
  {
    icon: Bug,
    title: "Mutation Packs",
    description: "Stress agents with schema drift, timeouts, rate limits, and poisoning scenarios.",
  },
  {
    icon: ClipboardList,
    title: "Run Inspector",
    description: "Find the first failing step fast with timeline-aware diagnostics.",
  },
  {
    icon: Binary,
    title: "Counterfactual Fixes",
    description: "Run what-if replays to verify remediations before shipping changes.",
  },
  {
    icon: LockKeyhole,
    title: "Policy Packs",
    description: "Enforce approval gates and safe-action controls during replay.",
  },
  {
    icon: GitPullRequestArrow,
    title: "GitHub PR Gate",
    description: "Block merges when reliability thresholds fail in CI.",
  },
];

export function FeatureGrid() {
  return (
    <section className="site-container mt-24">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.16em] text-primary">Features</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Reliability workflows built for agent platform teams.
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title} className="transition-transform duration-200 hover:-translate-y-1">
              <CardHeader>
                <div className="mb-3 inline-flex w-fit rounded-md border border-primary/25 bg-primary/10 p-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          );
        })}
      </div>
    </section>
  );
}
