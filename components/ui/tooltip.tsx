import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipContent = React.forwardRef<React.ElementRef<typeof TooltipPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>>(({ className, ...props }, ref) => (
  <TooltipPrimitive.Content ref={ref} className={cn("z-50 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-background-panel)] px-3 py-1.5 text-xs", className)} sideOffset={4} {...props} />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

