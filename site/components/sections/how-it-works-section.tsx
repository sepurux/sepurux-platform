import { Upload, FlaskConical, BarChart3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    icon: Upload,
    title: "Upload trace",
    snippet: "curl -X POST /v1/traces ...",
    description: "Capture tool-using agent behavior from a real execution trace.",
  },
  {
    icon: FlaskConical,
    title: "Run campaign",
    snippet: "POST /v1/runs { trace_id, campaign_id }",
    description: "Replay with mutation packs and policy packs to stress reliability.",
  },
  {
    icon: BarChart3,
    title: "Read report + fix",
    snippet: "GET /v1/runs/{run_id}/stats",
    description: "Inspect first-failure causes and verify fixes before merge.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="site-container mt-24">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.16em] text-primary">How It Works</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Launch reliability checks in minutes.
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Card key={step.title}>
              <CardHeader>
                <div className="mb-3 flex items-center justify-between">
                  <div className="inline-flex rounded-md border border-primary/25 bg-primary/10 p-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Step {index + 1}
                  </span>
                </div>
                <CardTitle>{step.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <pre className="overflow-x-auto rounded-md border border-border/70 bg-background/80 p-3 text-xs text-primary">
                  <code>{step.snippet}</code>
                </pre>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
