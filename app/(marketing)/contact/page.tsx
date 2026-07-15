import { SecurityTrustBlock } from "@/components/marketing/business-sections";
import { Card } from "@/components/ui/card";
import { CalendlyButton } from "@/components/marketing/calendly-button";

export default function ContactPage() {
  return (
    <main>
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-20 lg:grid-cols-[1fr_420px] lg:items-start">
        <div>
          <p className="section-label">Contact</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight md:text-7xl">Book an Operant demo through Calendly.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-text-muted)]">The product is workflow-specific, so the demo starts by mapping your authorised sources, policy risks, approval paths, and integration readiness.</p>
          <div className="mt-8"><CalendlyButton variant="accent" size="lg" showIcon /></div>
        </div>
        <Card className="p-6">
          <h2 className="text-2xl font-semibold">What to bring</h2>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-[var(--color-text-muted)]">
            <li>Example workflows where agent output needs governance.</li>
            <li>Source types you are authorised to ingest.</li>
            <li>Approval boundaries for risky communication.</li>
            <li>Connector requirements and security review needs.</li>
          </ul>
        </Card>
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-20"><SecurityTrustBlock /></section>
    </main>
  );
}

