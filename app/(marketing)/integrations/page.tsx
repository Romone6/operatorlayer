import { IntegrationGridDetailed, PageCTA } from "@/components/marketing/business-sections";
import { InfiniteLogoMarquee } from "@/components/marketing/product-surfaces";

export default function IntegrationsPage() {
  return (
    <main>
      <section className="mx-auto max-w-7xl px-5 py-20">
        <p className="section-label">Integrations</p>
        <h1 className="mt-4 max-w-5xl text-5xl font-semibold leading-tight md:text-7xl">Bring policy governance to the tools your teams already use.</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--color-text-muted)]">Operant is integration-first infrastructure, but it does not pretend live connectors are production-ready without credentials, permissions, and readiness checks.</p>
      </section>
      <InfiniteLogoMarquee />
      <section className="mx-auto max-w-7xl px-5 py-20">
        <IntegrationGridDetailed />
      </section>
      <PageCTA title="Request an integration review." body="Book a demo to map connector status, OAuth credentials, scopes, tenant setup, and rollout controls." secondaryHref="/security" secondaryLabel="Review controls" />
    </main>
  );
}
