import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-text-main)] text-[var(--color-background-panel)] shadow-[0_12px_26px_rgba(36,35,31,0.18)] hover:-translate-y-0.5 hover:bg-[var(--color-dark)]",
        secondary: "border border-[var(--color-border)] bg-[var(--color-background-panel)] text-[var(--color-text-main)] hover:-translate-y-0.5 hover:border-[var(--color-border-soft)] hover:bg-white",
        ghost: "text-[var(--color-text-main)] hover:bg-[var(--color-background-soft)]",
        accent: "bg-[var(--color-primary)] text-white shadow-[0_12px_24px_rgba(201,111,58,0.22)] hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)]",
        destructive: "bg-[var(--color-danger)] text-white hover:opacity-90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-7",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
