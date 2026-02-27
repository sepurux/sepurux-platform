import { cn } from "@/lib/utils";

export function ScreenshotPlaceholder({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
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
      </div>
    </div>
  );
}
