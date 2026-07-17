"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  ["Overview", "/app/overview"],
  ["Sources", "/app/sources"],
  ["Source Governance", "/app/source-governance"],
  ["Terminology", "/app/terminology"],
  ["Policies", "/app/policies"],
  ["Review Queue", "/app/review-queue"],
  ["Scenarios", "/app/scenarios"],
  ["Playground", "/app/playground"],
  ["Evaluations", "/app/evaluations"],
  ["Exports", "/app/exports"],
  ["Settings", "/app/settings"],
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-full border-r border-[var(--color-border)] bg-[var(--color-background-soft)] p-4 md:w-72">
      <p className="text-xl font-semibold">Operant</p>
      <nav className="mt-4 space-y-1">
        {items.map(([label, href]) => (
          <Link key={href} href={href} className={cn("block rounded-xl px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-white/10", pathname.startsWith(href) ? "bg-[var(--color-primary)] text-white" : "")}>
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}


