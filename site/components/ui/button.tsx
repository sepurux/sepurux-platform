import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-[rgba(var(--accent-rgb),0.34)] bg-primary text-primary-foreground shadow-[0_16px_32px_rgba(var(--accent-rgb),0.18)] hover:-translate-y-0.5 hover:brightness-110",
        secondary: "border border-white/12 bg-white/8 text-white hover:bg-white/12",
        ghost: "text-muted-foreground hover:bg-[rgba(255,255,255,0.6)] hover:text-foreground",
        outline:
          "border border-white/12 bg-white/8 text-slate-200 backdrop-blur-sm hover:-translate-y-0.5 hover:border-[rgba(var(--accent-rgb),0.3)] hover:bg-white/12 hover:text-white",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
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
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
