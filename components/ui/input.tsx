import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn("flex h-10 w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2 text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]", className)}
    {...props}
  />
));
Input.displayName = "Input";

