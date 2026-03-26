"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

export function IdPill({
  id,
  maxLength,
  className,
}: {
  id: string;
  maxLength?: number;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    void navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const display = maxLength ? id.slice(0, maxLength) : id;

  return (
    <span
      onClick={handleCopy}
      title={id}
      className={cn(
        "inline-flex cursor-copy items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted-foreground/20",
        className
      )}
    >
      {display}
      {copied ? (
        <Check className="h-3 w-3 shrink-0 text-teal" />
      ) : (
        <Copy className="h-2.5 w-2.5 shrink-0 opacity-40" />
      )}
    </span>
  );
}
