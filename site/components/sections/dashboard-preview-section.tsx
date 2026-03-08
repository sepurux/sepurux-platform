import { BarChart3, FlaskConical, Gauge, Layers3 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const metrics = [
  { label: "Campaigns", value: "12 active", icon: Layers3 },
  { label: "Traces", value: "3,482 indexed", icon: FlaskConical },
  { label: "Reports", value: "84 generated", icon: BarChart3 },
  { label: "Mutation Coverage", value: "78%", icon: Gauge },
];

export function DashboardPreviewSection() {
  return (
    <section className="site-container mt-24">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.16em] text-primary">Dashboard Preview</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Visualize Agent Failures
        </h2>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="faint-grid border-b border-border/70 bg-muted/20 px-6 py-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div
                    key={metric.label}
                    className="rounded-lg border border-border/70 bg-background/80 p-3"
                  >
                    <div className="mb-2 inline-flex rounded-md border border-primary/25 bg-primary/10 p-1.5">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">{metric.value}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 p-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-lg border border-border/70 bg-background/70 p-4">
              <p className="mb-4 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                Failure Trend
              </p>
              <div className="grid h-40 grid-cols-10 items-end gap-2">
                {[18, 42, 28, 55, 36, 62, 48, 70, 52, 66].map((height, index) => (
                  <div
                    key={index}
                    className="rounded-t bg-primary/60"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/70 p-4">
              <p className="mb-4 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                Top Failure Sources
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-md border border-border/70 bg-card/70 px-3 py-2">
                  <span className="text-muted-foreground">schema.drop_field</span>
                  <span className="text-foreground">31%</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/70 bg-card/70 px-3 py-2">
                  <span className="text-muted-foreground">fault.timeout</span>
                  <span className="text-foreground">26%</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/70 bg-card/70 px-3 py-2">
                  <span className="text-muted-foreground">instruction_injection</span>
                  <span className="text-foreground">18%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
