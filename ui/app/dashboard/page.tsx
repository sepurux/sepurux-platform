import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reliability analytics, replay attempts, and counterfactual comparisons.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>UI Scaffold Ready</CardTitle>
          <CardDescription>
            The dashboard modules and API-backed panels will be added in the next commit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Reliability", "--"],
              ["Runs", "--"],
              ["Failures", "--"],
              ["Avg Duration", "--"]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
