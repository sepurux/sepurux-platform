import { AlertTriangle, KeyRound, ShieldAlert, Waypoints } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const painPoints = [
  {
    icon: Waypoints,
    title: "Schema drift breaks orchestration",
    copy: "Tool responses change silently and agents crash mid-run.",
  },
  {
    icon: KeyRound,
    title: "Permission failures surface late",
    copy: "Privilege and token issues are only discovered in production workflows.",
  },
  {
    icon: ShieldAlert,
    title: "Prompt and payload injection risks",
    copy: "Unsafe instructions and poisoned tool outputs derail decision paths.",
  },
  {
    icon: AlertTriangle,
    title: "UI and API shape changes",
    copy: "Minor contract shifts trigger brittle automation behavior across teams.",
  },
];

export function ProblemSection() {
  return (
    <section className="site-container mt-24">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.16em] text-primary">The Problem</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Agents fail in the seams between tools.
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {painPoints.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardContent className="flex items-start gap-4 pt-6">
                <div className="rounded-md border border-primary/25 bg-primary/10 p-2.5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.copy}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
