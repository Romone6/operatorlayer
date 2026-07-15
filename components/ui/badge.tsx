import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      default: "border-[var(--color-border)] bg-[var(--color-background-panel)] text-[var(--color-text-muted)]",
      success: "border-[color:var(--color-success)]/30 bg-[color:var(--color-success)]/10 text-[var(--color-success)]",
      warning: "border-[color:var(--color-warning)]/30 bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
      danger: "border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
      violet: "border-[var(--color-border)] bg-[var(--color-background-soft)] text-[var(--color-text-muted)]",
      accent: "border-[color:var(--color-primary)]/30 bg-[color:var(--color-primary)]/10 text-[var(--color-primary-hover)]",
      dark: "border-white/10 bg-white/8 text-white/80",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
