import { Braces, Upload, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  { icon: Upload, label: "Upload traces via SDK or API" },
  { icon: Workflow, label: "Re-run workflows step-by-step" },
  { icon: Braces, label: "Inspect tool calls and model outputs" },
];

const sdkExample = `from sepurux import SepuruxClient, sepurux_trace

client = SepuruxClient(base_url="https://api.sepurux.com", api_key=os.getenv("SEPURUX_API_KEY"))

with sepurux_trace("incident_triage", {"incident_id": "INC-4321"}) as rec:
    rec.tool_call("alerts.fetch_active", {"service": "payments"})
    rec.tool_result("alerts.fetch_active", {"count": 4})
    rec.model_step("triage_llm", {"prompt": "summarize"}, {"severity": "high"})

trace_id = client.upload_trace(rec.to_trace())
# Optional: trigger replay campaign
run_id = client.start_run(trace_id=trace_id, campaign_id=os.getenv("SEPURUX_CAMPAIGN_ID"))`;

export function ReplayTracesSection() {
  return (
    <section className="site-container mt-24">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-primary">Replay Traces</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Replay Agent Workflows
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Replay real agent traces to reproduce failures deterministically instead of chasing
            intermittent incidents in production logs.
          </p>
          <div className="mt-6 space-y-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.label} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <div className="rounded-md border border-primary/25 bg-primary/10 p-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="pt-1">{feature.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">SDK Example</p>
              <Badge variant="outline">Python</Badge>
            </div>
            <pre className="overflow-x-auto rounded-lg border border-border/70 bg-background/85 p-4 text-[12px] leading-relaxed text-primary">
              <code>{sdkExample}</code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
