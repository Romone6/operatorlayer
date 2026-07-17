import Link from "next/link";

import { WordmarkLink } from "@/components/marketing/brand";

export function MarketingNavbar() {
  return <header className="border-b border-[var(--color-border)] bg-[var(--color-background)]"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"><WordmarkLink /><nav className="flex items-center gap-4 text-sm"><Link href="/docs">Docs</Link><Link href="/security">Security</Link><Link href="/sign-in">Sign in</Link></nav></div></header>;
}
