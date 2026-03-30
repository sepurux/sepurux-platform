import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_10px_24px_hsl(var(--primary)/0.24)] hover:-translate-y-px hover:brightness-110",
        secondary:
          "bg-accent text-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-accent/85",
        ghost: "hover:bg-accent/70 hover:text-accent-foreground",
        outline:
          "border border-border/80 bg-card/45 text-foreground hover:border-primary/45 hover:bg-accent/55",
        danger:
          "bg-danger text-white shadow-[0_0_0_1px_hsl(var(--danger)/0.4),0_10px_24px_hsl(var(--danger)/0.18)] hover:brightness-110"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-5",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
