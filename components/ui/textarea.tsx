import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn("min-h-[96px] w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2 text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

