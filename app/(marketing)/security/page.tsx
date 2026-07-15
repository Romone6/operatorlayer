import { PageCTA, SecurityTrustBlock } from "@/components/marketing/business-sections";
import { SecurityPanel } from "@/components/marketing/product-surfaces";
import { governanceItems } from "@/components/marketing/operant-data";
import { Card } from "@/components/ui/card";

export default function SecurityPage() {
  return (
    <main>
      <section className="mx-auto max-w-7xl px-5 py-20">
        <p className="section-label">Security and governance</p>
        <h1 className="mt-4 max-w-5xl text-5xl font-semibold leading-tight md:text-7xl">Control the boundary between agents, company data, and customers.</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--color-text-muted)]">Operant is built around permissioned ingestion, source-level controls, human review, approval gates, audit logs, and clear enterprise readiness states.</p>
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-20"><SecurityTrustBlock /></section>
      <section className="mx-auto max-w-7xl px-5 pb-20">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {governanceItems.map((item) => { const Icon = item.icon; return <Card key={item.title} className="p-5"><Icon className="h-5 w-5 text-[var(--color-primary-hover)]" aria-hidden="true" /><h2 className="mt-4 text-xl font-semibold">{item.title}</h2><p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{item.body}</p></Card>; })}
        </div>
      </section>
      <SecurityPanel />
      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-5 lg:grid-cols-3">
          {[
            ["Data handling", "Customer-owned data posture by default. No hidden training of general models on customer data is claimed."],
            ["Access control", "Organisation isolation, least-privilege connector setup, and explicit readiness blockers for missing credentials."],
            ["Compliance roadmap", "Controls are organised by current capability, roadmap area, and enterprise review requirement."],
          ].map(([title, body]) => <Card key={title} className="p-6"><h2 className="text-2xl font-semibold">{title}</h2><p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{body}</p></Card>)}
        </div>
      </section>
      <PageCTA title="Review Operant with your security team." body="Use the security page as the starting point for controls, boundaries, and enterprise setup requirements." secondaryHref="/docs" secondaryLabel="Open docs" />
    </main>
  );
}
