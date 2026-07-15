"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { CalendlyButton } from "@/components/marketing/calendly-button";
import { productMenuItems, solutionMenuItems, type MenuItem } from "@/components/marketing/operant-data";
import { WordmarkLink } from "@/components/marketing/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/integrations", label: "Integrations" },
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
  { href: "/customers", label: "Customers" },
  { href: "/contact", label: "Contact" },
];

function MegaMenuPanel({ items }: { items: MenuItem[] }) {
  return (
    <div className="invisible absolute left-1/2 top-full z-50 mt-3 w-[680px] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-[1.35rem] border border-white/10 bg-[var(--color-dark)] p-3 text-white opacity-0 shadow-[0_28px_80px_rgba(0,0,0,0.26)] transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
      <div className="grid gap-1 md:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.title} href={item.href} className="flex gap-3 rounded-2xl p-3 text-left transition hover:bg-white/8 focus:bg-white/8 focus:outline-none">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/8 text-[var(--color-primary-soft)]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">{item.title}</span>
                <span className="mt-1 block text-xs leading-5 text-white/58">{item.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MegaMenuTrigger({ label, href, items }: { label: string; href: string; items: MenuItem[] }) {
  return (
    <div className="group relative">
      <Link href={href} className="rounded-full px-3 py-2 text-sm text-[var(--color-text-muted)] transition hover:bg-[var(--color-background-soft)] hover:text-[var(--color-text-main)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
        {label}
      </Link>
      <MegaMenuPanel items={items} />
    </div>
  );
}

export function MarketingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[color:var(--color-background)]/88 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1560px] items-center justify-between px-5 py-3.5 lg:px-10 xl:px-12">
        <WordmarkLink />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          <MegaMenuTrigger label="Product" href="/product" items={productMenuItems} />
          <MegaMenuTrigger label="Solutions" href="/solutions" items={solutionMenuItems} />
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-full px-3 py-2 text-sm text-[var(--color-text-muted)] transition hover:bg-[var(--color-background-soft)] hover:text-[var(--color-text-main)]">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <CalendlyButton variant="accent" size="sm" />
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-background-panel)] lg:hidden"
          aria-expanded={open}
          aria-label="Toggle menu"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>
      <div className={cn("border-t border-[var(--color-border)] bg-[var(--color-background-panel)] px-5 py-4 lg:hidden", open ? "block" : "hidden")}>
        <div className="grid gap-2">
          {[{ href: "/product", label: "Product" }, { href: "/solutions", label: "Solutions" }, ...navItems].map((item) => (
            <Link key={item.href} href={item.href} className="rounded-xl px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-background-soft)]" onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center gap-2 border-t border-[var(--color-border)] pt-4">
            <Button asChild variant="secondary" size="sm" className="flex-1">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <CalendlyButton variant="accent" size="sm" className="flex-1" />
          </div>
        </div>
      </div>
    </header>
  );
}
