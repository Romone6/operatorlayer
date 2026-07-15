import * as React from "react";
import { Controller, FormProvider, useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";

export { FormProvider as Form };

export const FormField = Controller;

export function FormItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

export function FormLabel({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium", className)} {...props} />;
}

export function FormControl({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function FormDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-[var(--color-text-soft)]", className)} {...props} />;
}

export function FormMessage({ className }: { className?: string }) {
  const { formState } = useFormContext();
  const errors = Object.values(formState.errors);
  if (!errors.length) return null;
  const first = errors[0];
  return <p className={cn("text-xs text-rose-400", className)}>{String(first?.message ?? "Invalid field")}</p>;
}

