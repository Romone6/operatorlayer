import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border-strong,var(--color-border-soft))] bg-[var(--color-dark)] text-[var(--color-background-panel)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
        className
      )}
    >
      <span className="absolute h-[21px] w-[21px] rounded-[0.45rem] border border-current" />
      <span className="absolute h-[13px] w-[13px] rounded-[0.28rem] border border-[var(--color-primary)]" />
      <span className="absolute left-[5px] top-1/2 h-px w-3 -translate-y-1/2 bg-current" />
      <span className="absolute right-[5px] top-1/2 h-px w-3 -translate-y-1/2 bg-current" />
      <span className="absolute bottom-[5px] left-1/2 h-3 w-px -translate-x-1/2 bg-current" />
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)] shadow-[0_0_0_3px_rgba(201,111,58,0.15)]" />
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-semibold tracking-[-0.035em] text-[var(--color-text-main)]", className)}>
      <LogoMark />
      <span className="text-3xl">Operant</span>
    </span>
  );
}

export function WordmarkLink({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="Operant home" className={cn("inline-flex", className)}>
      <Wordmark />
    </Link>
  );
}
