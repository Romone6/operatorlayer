import { CustomerStoryGrid, HonestLogoWall, PageCTA } from "@/components/marketing/business-sections";

export default function CustomersPage() {
  return (
    <main>
      <section className="mx-auto max-w-7xl px-5 py-20">
        <p className="section-label">Customer stories</p>
        <h1 className="mt-4 text-6xl font-semibold leading-[0.96] md:text-8xl">Customer Stories</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--color-text-muted)]">A future-ready customer stories page for teams governing AI-assisted support, sales, customer success, operations, and enterprise AI workflows.</p>
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-16">
        <div className="mb-5"><p className="section-label">Ecosystem</p><h2 className="mt-3 text-3xl font-semibold">Works with the tools modern teams already use.</h2></div>
        <HonestLogoWall />
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-20">
        <div className="mb-6 flex flex-wrap gap-2">
          {["Sales", "Support", "Customer Success", "Operations", "Enterprise AI Teams"].map((filter) => <span key={filter} className="rounded-full border border-[var(--color-border)] bg-[var(--color-background-panel)] px-4 py-2 text-sm text-[var(--color-text-muted)]">{filter}</span>)}
        </div>
        <CustomerStoryGrid />
      </section>
      <PageCTA title="Built for teams managing high-stakes AI communication." body="Talk with Operant about governed review queues, policy-backed outputs, and audit-ready workflows." secondaryHref="/security" secondaryLabel="Review security" />
    </main>
  );
}
