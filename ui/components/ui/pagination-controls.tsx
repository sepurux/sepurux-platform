import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  currentCount: number;
  hasNext: boolean;
  loading?: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export function PaginationControls({
  page,
  pageSize,
  currentCount,
  hasNext,
  loading = false,
  onPrev,
  onNext,
}: PaginationControlsProps) {
  const start = currentCount === 0 ? 0 : page * pageSize + 1;
  const end = page * pageSize + currentCount;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {start}–{end}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={loading || page <= 0} onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <div className="rounded-md border border-border/70 bg-card/70 px-3 py-1.5 text-sm text-foreground">
          Page {page + 1}
        </div>
        <Button variant="outline" size="sm" disabled={loading || !hasNext} onClick={onNext}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

