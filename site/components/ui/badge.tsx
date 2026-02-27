import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-accent/70 text-accent-foreground",
        success: "border-emerald-400/30 bg-emerald-500/15 text-emerald-300",
        danger: "border-rose-400/30 bg-rose-500/15 text-rose-300",
        warning: "border-amber-400/30 bg-amber-500/15 text-amber-300",
        outline: "border-border/80 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
