import { FlaskConical, Sparkles } from "lucide-react";

import { type CounterfactualListItem } from "@/lib/api";
import { formatDurationMs, titleFromStrategy } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CounterfactualResultsCard({
  items,
  loading = false,
  error,
  title = "Counterfactual Results",
  description = "What-if replays for the selected failed attempt.",
  compact = false,
}: {
  items: CounterfactualListItem[];
  loading?: boolean;
  error?: string | null;
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: compact ? 2 : 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-md border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>
        ) : items.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
            No counterfactual rows found for this attempt.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={`${item.strategy}:${item.created_at}`} className="rounded-md border border-border/60 bg-muted/15 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {titleFromStrategy(item.strategy)}
                  </div>
                  <Badge variant={item.result.toLowerCase().startsWith("pass") ? "success" : "danger"}>{item.result}</Badge>
                  {item.failure_reason ? <Badge variant="outline">{item.failure_reason}</Badge> : null}
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <CounterfactualMeta label="Duration" value={extractDurationLabel(item)} />
                  <CounterfactualMeta label="Retries" value={extractRetriesLabel(item)} />
                </div>

                <div className="mt-3 rounded-md border border-border/50 bg-card/40 px-3 py-2 text-sm text-muted-foreground">
                  <span className="text-xs uppercase tracking-wide">Diff</span>
                  <p className="mt-1 text-foreground/90">{summarizeDiff(item.diff)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CounterfactualMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/50 bg-card/30 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

function extractDurationLabel(item: CounterfactualListItem) {
  const duration = item.metrics && typeof item.metrics.duration_ms === "number" ? item.metrics.duration_ms : null;
  return duration === null ? "--" : formatDurationMs(duration);
}

function extractRetriesLabel(item: CounterfactualListItem) {
  const retries = item.metrics && typeof item.metrics.retries === "number" ? item.metrics.retries : null;
  return retries === null ? "--" : String(retries);
}

function summarizeDiff(diff: Record<string, unknown> | null) {
  if (!diff) return "No diff metadata available.";

  const kind = typeof diff.kind === "string" ? diff.kind : "change";
  if (kind === "retry_policy") {
    return `Retry override: max_retries=${String(diff.max_retries ?? "?")}, backoff_ms=${String(diff.backoff_ms ?? "?")}.`;
  }
  if (kind === "policy_gate") {
    const requiresToken = diff.requires_confirmation_token === true ? "requires confirmation token" : "no token required";
    return `Policy gate ${requiresToken}; irreversible calls may be blocked before execution.`;
  }
  if (kind === "tool_result_adapter") {
    const mappings = diff.field_mappings && typeof diff.field_mappings === "object" ? Object.keys(diff.field_mappings as object) : [];
    return `Schema adapter post-processed tool results using ${mappings.length ? mappings.slice(0, 3).join(", ") : "rule-based mappings"}.`;
  }

  return `Counterfactual diff kind: ${kind}.`;
}
