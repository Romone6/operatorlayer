import Link from "next/link";

import { CalendlyButton } from "@/components/marketing/calendly-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function HeroBadge({ text }: { text: string }) { return <Badge variant="accent">{text}</Badge>; }

export function HeroSection({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <section className="hero-surface border-b border-[var(--color-border)] px-5 py-20">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <h1 className="text-5xl font-semibold leading-tight md:text-7xl">{title}</h1>
          <p className="mt-5 text-lg leading-8 text-[var(--color-text-muted)]">{subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CalendlyButton variant="accent" />
            <Button asChild variant="secondary"><Link href="/product">See how it works</Link></Button>
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-background-panel)] p-6">
          {children ?? <p className="text-sm text-[var(--color-text-muted)]">Operant product preview.</p>}
        </div>
      </div>
    </section>
  );
}
