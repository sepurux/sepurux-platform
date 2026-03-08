import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const painPoints = [
  "Tool schema changes break workflows",
  "API responses drift silently",
  "Latency and retries cascade failures",
  "Prompt injection corrupts tool execution",
];

export function ProblemSection() {
  return (
    <section className="site-container mt-24">
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-primary">Problem</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            AI Agents Fail in Production
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Agent behavior breaks unpredictably when integrations move underneath you: tools change
            shape, APIs drift, latency spikes trigger retries, and hostile instructions contaminate
            execution.
          </p>
          <ul className="mt-6 space-y-3">
            {painPoints.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(14,165,233,0.16),transparent_48%),radial-gradient(circle_at_85%_78%,rgba(34,197,94,0.12),transparent_42%)]" />
          <CardContent className="relative space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Failure Path Diagram
              </p>
              <Badge variant="danger">Unstable</Badge>
            </div>

            <div className="rounded-lg border border-border/70 bg-background/70 p-4">
              <div className="grid gap-3">
                <div className="rounded-md border border-border/70 bg-card/80 p-3 text-xs text-foreground">
                  Agent Plan
                </div>
                <div className="ml-4 rounded-md border border-border/70 bg-card/80 p-3 text-xs text-foreground">
                  Tool Schema v1 → v2
                </div>
                <div className="ml-8 rounded-md border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                  Payload parse failure
                </div>
                <div className="ml-4 rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  Retry storm + timeout chain
                </div>
                <div className="rounded-md border border-border/70 bg-card/80 p-3 text-xs text-foreground">
                  Incident triggered
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
