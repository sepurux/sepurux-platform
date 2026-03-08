import { ShieldAlert, TimerReset, WandSparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const mutationCards = [
  {
    icon: WandSparkles,
    title: "Schema Mutation",
    copy: "Rename fields, drop keys, and modify JSON payloads to simulate API contract drift.",
  },
  {
    icon: TimerReset,
    title: "Latency Storm",
    copy: "Simulate timeouts, slow upstreams, and retry chain reactions under load.",
  },
  {
    icon: ShieldAlert,
    title: "Injection Attacks",
    copy: "Inject prompt and tool output attacks to test defensive behavior end-to-end.",
  },
];

export function MutationTestingSection() {
  return (
    <section className="site-container mt-24">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.16em] text-primary">Mutation Testing</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Inject Chaos Into Agent Runs
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {mutationCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_55%)]" />
              <CardHeader className="relative">
                <div className="inline-flex w-fit rounded-md border border-primary/25 bg-primary/10 p-2.5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>{card.title}</CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-sm text-muted-foreground">{card.copy}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
