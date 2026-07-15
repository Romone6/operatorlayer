import { PageCTA } from "@/components/marketing/business-sections";
import { DifferentiationGrid } from "@/components/marketing/product-surfaces";

export default function AboutPage() {
  return (
    <main>
      <section className="mx-auto max-w-7xl px-5 py-20">
        <p className="section-label">About Operant</p>
        <h1 className="mt-4 max-w-5xl text-5xl font-semibold leading-tight md:text-7xl">AI agents need operating instructions, not another generic dashboard.</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--color-text-muted)]">Operant is B2B communication intelligence and governance infrastructure for companies deploying AI agents into real workflows.</p>
      </section>
      <DifferentiationGrid />
      <PageCTA title="Build the operating layer before scaling agents." body="Start with real sources, real rules, real review queues, and no fabricated output." />
    </main>
  );
}
