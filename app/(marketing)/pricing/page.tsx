import Link from "next/link";

import { AlternativeComparisonTable, ComparisonTable, PageCTA, PricingCards, PricingFAQ, SecurityTrustBlock } from "@/components/marketing/business-sections";
import { Button } from "@/components/ui/button";
import { CalendlyButton } from "@/components/marketing/calendly-button";

export default function PricingPage() {
  return (
    <main>
      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="max-w-4xl">
          <p className="section-label">Pricing</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight md:text-7xl">Govern agent work before it reaches customers.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--color-text-muted)]">Plans are demo-led so pricing can map to source volume, review workflows, integration readiness, and enterprise controls.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CalendlyButton variant="accent" size="lg" />
            <Button asChild variant="secondary" size="lg"><Link href="#comparison">Compare plans</Link></Button>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-20"><PricingCards /></section>
      <section className="mx-auto max-w-7xl px-5 pb-20" id="comparison">
        <div className="mb-6"><p className="section-label">Feature comparison</p><h2 className="mt-3 text-4xl font-semibold">What each plan is designed to control.</h2></div>
        <ComparisonTable />
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-20">
        <div className="mb-6"><p className="section-label">Alternatives</p><h2 className="mt-3 text-4xl font-semibold">Structural differences across review and automation approaches.</h2></div>
        <AlternativeComparisonTable />
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-20"><SecurityTrustBlock /></section>
      <section className="mx-auto max-w-7xl px-5 pb-20"><div className="mb-6"><p className="section-label">FAQ</p><h2 className="mt-3 text-4xl font-semibold">Common buying questions.</h2></div><PricingFAQ /></section>
      <PageCTA title="Price the operating layer around your real workflow." body="Book a demo to map sources, approvals, review volume, integrations, and export needs." />
    </main>
  );
}
