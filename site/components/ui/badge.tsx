import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-white/10 bg-white/6 text-muted-foreground",
        success: "border-success/45 bg-success/15 text-success",
        danger: "border-danger/45 bg-danger/15 text-danger",
        warning: "border-warning/45 bg-warning/15 text-warning",
        info: "border-info/45 bg-info/15 text-info",
        neutral: "border-neutral-muted/45 bg-neutral-muted/15 text-neutral-muted",
        outline: "border-white/10 text-muted-foreground",
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
