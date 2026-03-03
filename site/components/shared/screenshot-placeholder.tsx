import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

export function ScreenshotPlaceholder({
  title,
  className,
  command,
  animateCommand = false,
  resultLines,
  terminalLabel,
}: {
  title: string;
  className?: string;
  command?: string;
  animateCommand?: boolean;
  resultLines?: string[];
  terminalLabel?: string;
}) {
  const typingStyle = animateCommand
    ? ({
        "--typing-width": `${command?.length ?? 0}ch`,
        "--typing-steps": `${command?.length ?? 0}`,
      } as CSSProperties)
    : undefined;

  const lines = resultLines ?? [
    "status: done",
    "pass_rate: 0.92",
    "first_failure_tool: jira.create_issue",
  ];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/80 bg-card/90 p-4 shadow-panel shadow-black/40",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        </div>
      </div>
      <div className="faint-grid rounded-lg border border-border/70 bg-muted/20 p-4">
        {command ? (
          <div className="rounded-md border border-border/70 bg-background/80 p-3 font-mono text-xs">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-success/80" />
              <span>{terminalLabel ?? "run-inspector.sh"}</span>
            </div>
            <div className="flex items-center text-primary">
              <span className="mr-2 text-success">$</span>
              <span
                className={cn(
                  "inline-block overflow-hidden whitespace-nowrap",
                  animateCommand && "terminal-type-command"
                )}
                style={typingStyle}
              >
                {command}
              </span>
              {animateCommand ? <span className="terminal-caret ml-0.5" aria-hidden /> : null}
            </div>
            <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
              {lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="h-3 w-2/3 rounded bg-primary/40" />
            <div className="h-3 w-5/6 rounded bg-muted" />
            <div className="h-20 rounded-md border border-border/70 bg-background/70" />
            <div className="grid grid-cols-3 gap-2">
              <div className="h-8 rounded border border-border/70 bg-background/50" />
              <div className="h-8 rounded border border-border/70 bg-background/50" />
              <div className="h-8 rounded border border-border/70 bg-background/50" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
