import { Fingerprint, Lock, ScrollText } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const points = [
  {
    icon: Lock,
    title: "Tenant and project isolation",
    copy: "Scope traces, campaigns, runs, and analytics by tenant/project boundaries.",
  },
  {
    icon: ScrollText,
    title: "Policy and audit visibility",
    copy: "Track policy events and run decisions with clear timeline context.",
  },
  {
    icon: Fingerprint,
    title: "No production credentials required",
    copy: "Replay from captured traces without direct access to production secrets.",
  },
];

export function SecuritySection() {
  return (
    <section className="site-container mt-24">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.16em] text-primary">Security & Compliance</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Built for enterprise reliability programs.
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {points.map((point) => {
          const Icon = point.icon;
          return (
            <Card key={point.title}>
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex rounded-md border border-primary/25 bg-primary/10 p-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground">{point.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{point.copy}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
