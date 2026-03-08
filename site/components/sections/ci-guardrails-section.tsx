import { GitBranch, ShieldX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const ciSnippet = `name: sepurux-gate
on: [pull_request]

jobs:
  reliability-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: sepurux replay --trace trace.json --campaign core-reliability
      - run: sepurux gate --min-pass-rate 0.85 --max-unsafe 0`;

export function CIGuardrailsSection() {
  return (
    <section className="site-container mt-24">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-primary">CI Guardrails</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Block Regressions Before Deployment
          </h2>
          <p className="mt-4 text-muted-foreground">
            Connect Sepurux to CI so reliability regressions and unsafe runs fail fast before
            they reach production.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <GitBranch className="mt-0.5 h-4 w-4 text-primary" />
              <span>GitHub Actions integration for replay + mutation tests.</span>
            </li>
            <li className="flex items-start gap-3">
              <ShieldX className="mt-0.5 h-4 w-4 text-primary" />
              <span>Fail builds when mutation coverage thresholds are missed.</span>
            </li>
            <li className="flex items-start gap-3">
              <ShieldX className="mt-0.5 h-4 w-4 text-primary" />
              <span>Prevent unsafe deployments automatically.</span>
            </li>
          </ul>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">CI YAML</p>
              <Badge variant="outline">GitHub Actions</Badge>
            </div>
            <pre className="overflow-x-auto rounded-lg border border-border/70 bg-background/85 p-4 text-[12px] leading-relaxed text-primary">
              <code>{ciSnippet}</code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
