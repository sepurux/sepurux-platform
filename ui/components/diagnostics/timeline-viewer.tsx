import { AlertTriangle, Bot, Hammer, Wrench } from "lucide-react";

import { type AttemptTimeline } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function eventIcon(type: string) {
  switch (type) {
    case "tool_call":
      return Hammer;
    case "tool_result":
      return Wrench;
    case "model":
      return Bot;
    case "error":
      return AlertTriangle;
    default:
      return Bot;
  }
}

function badgeVariant(type: string): "default" | "success" | "warning" | "danger" {
  switch (type) {
    case "tool_result":
      return "success";
    case "tool_call":
      return "default";
    case "error":
      return "danger";
    default:
      return "warning";
  }
}

function toJsonPreview(value: unknown) {
  if (value == null) return null;
  try {
    const text = JSON.stringify(value, null, 2);
    return text.length > 600 ? `${text.slice(0, 600)}\n…` : text;
  } catch {
    return String(value);
  }
}

export function TimelineViewer({
  timeline,
  title = "Attempt Timeline",
  description,
  compact = false,
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
      <CardContent className="min-w-0 space-y-4">
        {timeline?.first_failure ? (
          <div className="rounded-md border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            <span className="font-medium">First failure:</span>{" "}
            {timeline.first_failure.tool ?? "unknown"} at event #{timeline.first_failure.event_index ?? "?"}
            {timeline.first_failure.reason ? ` (${timeline.first_failure.reason})` : ""}
          </div>
        ) : null}

        {events.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
            No timeline events available.
          </div>
        ) : (
          <div className="min-w-0 space-y-3">
            {events.map((event) => {
              const Icon = eventIcon(event.type);
              const preview = toJsonPreview(event.error ?? event.result ?? event.args);
              return (
                <div key={`${event.index}-${event.type}`} className="min-w-0 rounded-md border border-border/60 bg-card/50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="grid h-7 w-7 place-items-center rounded-md border border-border/60 bg-muted/20">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Badge variant={badgeVariant(event.type)}>{event.type}</Badge>
                    <span className="text-sm font-medium text-foreground">#{event.index}</span>
                    {event.tool ? <span className="min-w-0 break-all text-sm text-muted-foreground">{event.tool}</span> : null}
                  </div>
                  {preview ? (
                    <pre className="mt-3 max-w-full overflow-x-auto rounded-md border border-border/40 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
                      {preview}
                    </pre>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
