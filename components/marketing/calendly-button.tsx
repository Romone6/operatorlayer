"use client";

import { CalendarDays } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FALLBACK_CALENDLY_URL = "https://calendly.com/operant/demo"; // TODO: replace with the production Calendly URL in NEXT_PUBLIC_CALENDLY_URL.

type CalendlyButtonProps = Omit<ButtonProps, "asChild" | "onClick"> & {
  label?: string;
  showIcon?: boolean;
};

export function getCalendlyUrl() {
  return process.env.NEXT_PUBLIC_CALENDLY_URL || FALLBACK_CALENDLY_URL;
}

export function CalendlyButton({ label = "Book a demo", showIcon = false, className, variant, size, ...props }: CalendlyButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
      onClick={() => window.open(getCalendlyUrl(), "_blank", "noopener,noreferrer")}
      {...props}
    >
      {showIcon ? <CalendarDays className="h-4 w-4" aria-hidden="true" /> : null}
      {label}
    </Button>
  );
}
