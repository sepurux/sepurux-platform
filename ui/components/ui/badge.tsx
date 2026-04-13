import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-border/70 bg-muted/45 text-muted-foreground",
        success: "border-success/40 bg-success/12 text-success",
        danger: "border-danger/50 bg-danger/16 text-danger",
        warning: "border-warning/55 bg-warning/16 text-warning",
        info: "border-info/50 bg-info/16 text-info",
        neutral: "border-neutral/45 bg-neutral/18 text-neutral",
        outline: "border-border/80 text-muted-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
