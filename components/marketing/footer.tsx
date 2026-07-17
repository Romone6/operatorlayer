import Link from "next/link";

export function MarketingFooter() {
  return <footer className="border-t border-[var(--color-border)]"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-[var(--color-text-soft)]"><p>Operant is open-source software for communication guidance.</p><div className="flex gap-4"><Link href="/docs">Docs</Link><Link href="/security">Security</Link><Link href="/contact">Contact</Link></div></div></footer>;
}
