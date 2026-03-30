import { AlertTriangle, Bot, Hammer, Wrench, Zap } from "lucide-react";

import { type AttemptTimeline } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Type config — mirrors trace-detail-view color system
// ---------------------------------------------------------------------------

const EVENT_TYPE_CONFIG: Record<string, { iconColor: string; dotBg: string; dotBorder: string; accentBorder: string }> = {
  tool_call:    { iconColor: "text-blue-400",        dotBg: "bg-blue-400/10",   dotBorder: "border-blue-400/40",   accentBorder: "border-l-blue-400/60" },
  tool_result:  { iconColor: "text-teal",            dotBg: "bg-teal/10",       dotBorder: "border-teal/40",       accentBorder: "border-l-teal/60" },
  model:        { iconColor: "text-primary",         dotBg: "bg-primary/10",    dotBorder: "border-primary/40",    accentBorder: "border-l-primary/60" },
  llm_call:     { iconColor: "text-primary",         dotBg: "bg-primary/10",    dotBorder: "border-primary/40",    accentBorder: "border-l-primary/60" },
  mutation:     { iconColor: "text-amber-400",       dotBg: "bg-amber-400/10",  dotBorder: "border-amber-400/40",  accentBorder: "border-l-amber-400/60" },
  error:        { iconColor: "text-danger",          dotBg: "bg-danger/10",     dotBorder: "border-danger/35",     accentBorder: "border-l-danger/60" },
};

const DEFAULT_EVENT_CONFIG = {
  iconColor: "text-muted-foreground",
  dotBg: "bg-muted/60",
  dotBorder: "border-border/70",
  accentBorder: "border-l-border/60",
};

function iconForEvent(type: string) {
  switch (type) {
    case "tool_call":   return Hammer;
    case "tool_result": return Wrench;
    case "model":
    case "llm_call":    return Bot;
    case "mutation":    return Zap;
    case "error":       return AlertTriangle;
    default:            return Bot;
  }
}

function badgeVariantForType(type: string): "default" | "success" | "warning" | "danger" | "outline" {
  if (type === "tool_result") return "success";
  if (type === "error")       return "danger";
  if (type === "mutation")    return "warning";
  return "outline";
}

// ---------------------------------------------------------------------------
// JSON preview helper
// ---------------------------------------------------------------------------

function toJsonPreview(value: unknown): string | null {
  if (value == null) return null;
  try {
    const text = JSON.stringify(value, null, 2);
    return text.length > 900 ? `${text.slice(0, 900)}\n…` : text;
  } catch {
    return String(value);
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimelineViewer({
  timeline,
  title = "Attempt Timeline",
  description,
}: {
  timeline: AttemptTimeline | null;
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  const events = Array.isArray(timeline?.events) ? timeline.events : [];

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description ?? "Tool calls, results, model summaries, and error checkpoints for the replay attempt."}
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        {timeline?.first_failure ? (
          <div className="mb-4 rounded-md border border-danger/20 bg-danger/8 px-3 py-2 text-sm text-danger">
            <span className="font-semibold">First failure:</span>{" "}
            {timeline.first_failure.tool ?? "unknown"} at event #{timeline.first_failure.event_index ?? "?"}
            {timeline.first_failure.reason ? ` — ${timeline.first_failure.reason}` : ""}
          </div>
        ) : null}

        {events.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
            No timeline events available.
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, index) => {
              const Icon = iconForEvent(event.type);
              const cfg = EVENT_TYPE_CONFIG[event.type] ?? DEFAULT_EVENT_CONFIG;
              const payload = event.error ?? event.result ?? event.args;
              const preview = toJsonPreview(payload);
              const hasPayload = preview != null;

              return (
                <div key={`${event.index}-${event.type}-${index}`} className="relative pl-10">
                  {index < events.length - 1 ? (
                    <div className="absolute left-[1.1rem] top-9 h-[calc(100%+0.25rem)] w-0.5 bg-border/50" />
                  ) : null}

                  {/* Event dot */}
                  <div className={`absolute left-0 top-2 grid h-8 w-8 place-items-center rounded-full border ${cfg.dotBg} ${cfg.dotBorder} shadow-sm`}>
                    <Icon className={`h-3.5 w-3.5 ${cfg.iconColor}`} />
                  </div>

                  {/* Event card */}
                  <div className={`rounded-lg border border-border/60 border-l-2 ${cfg.accentBorder} bg-card/60`}>
                    {/* Header row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {event.tool ? (
                          <span className="min-w-0 break-all text-sm font-semibold text-foreground">{event.tool}</span>
                        ) : null}
                        <Badge variant={badgeVariantForType(event.type)} className="shrink-0 text-[10px]">
                          {event.type.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {event.latency_ms != null ? (
                          <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {event.latency_ms < 1000 ? `${event.latency_ms}ms` : `${(event.latency_ms / 1000).toFixed(1)}s`}
                          </span>
                        ) : null}
                        <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                          #{event.index}
                        </span>
                      </div>
                    </div>

                    {/* Collapsible payload */}
                    {hasPayload ? (
                      <details className="group border-t border-border/40">
                        <summary className="flex cursor-pointer select-none items-center gap-1.5 px-4 py-2 text-[11px] text-muted-foreground hover:text-foreground">
                          <svg className="h-3 w-3 rotate-[-90deg] transition-transform group-open:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          {event.error ? "Error" : event.result ? "Result" : "Args"}
                        </summary>
                        <pre className="px-4 pb-4 pt-1 text-[11px] leading-relaxed text-muted-foreground overflow-x-auto">
                          {preview}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
