import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
        warning:
          "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
        urgent:
          "border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
        high: "border-transparent bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
        medium:
          "border-transparent bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
        low: "border-transparent bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30",
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
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
