import { BadgeCheck, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const policySnippet = `# Commit token required for irreversible actions
payments.refund(commit)
jira.create_issue(commit)

# Crash Lab policy response
{
  "decision": "require_approval",
  "reason": "irreversible_action_missing_commit"
}`;

export function PolicyGatesSection() {
  return (
    <section className="site-container mt-24">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-primary">Policy Gates</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Guardrail Every Tool
          </h2>
          <p className="mt-4 text-muted-foreground">
            Enforce approval tokens for irreversible actions and block unsafe tool calls before
            they execute in production.
          </p>
          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
              <span>Approval tokens required for high-risk tools.</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <BadgeCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
              <span>Safe-action enforcement prevents accidental destructive actions.</span>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Policy Example</p>
              <Badge variant="success">Guarded</Badge>
            </div>
            <pre className="overflow-x-auto rounded-lg border border-border/70 bg-background/85 p-4 text-[12px] leading-relaxed text-primary">
              <code>{policySnippet}</code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
