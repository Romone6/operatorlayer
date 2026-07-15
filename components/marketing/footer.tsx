import Link from "next/link";

import { CalendlyButton } from "@/components/marketing/calendly-button";
import { Wordmark } from "@/components/marketing/brand";
import { footerColumns } from "@/components/marketing/operant-data";

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-dark)] text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[1.1fr_2fr] lg:px-6">
        <div>
          <Wordmark className="text-white [&_span:last-child]:text-white" />
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/58">Operant turns company policy, terminology, scenarios, approvals, and evaluation standards into operating instructions AI agents can safely use.</p>
          <div className="mt-6">
            <CalendlyButton variant="accent" size="sm" />
          </div>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">{column.title}</p>
              <div className="mt-4 space-y-3">
                {column.links.map(([label, href]) => (
                  <Link key={label} href={href} className="block text-sm text-white/62 transition hover:text-white">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-white/42 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <p>© Operant 2026. All rights reserved.</p>
          <p>AI agent communication governance.</p>
        </div>
      </div>
    </footer>
  );
}
