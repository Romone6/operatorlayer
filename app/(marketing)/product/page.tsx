import { DifferentiationGrid, StickyProductTour, WorkflowCanvas } from "@/components/marketing/product-surfaces";
import { PageCTA } from "@/components/marketing/business-sections";

export default function ProductPage() {
  return (
    <main>
      <section className="mx-auto max-w-7xl px-5 py-20">
        <p className="section-label">Product</p>
        <h1 className="mt-4 max-w-5xl text-5xl font-semibold leading-tight md:text-7xl">From scattered company knowledge to agent-ready operating instructions.</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--color-text-muted)]">Operant extracts rules, terminology, scenarios, approvals, and evaluation standards from authorised sources, then uses them to guide, evaluate, repair, approve, and export agent work.</p>
      </section>
      <StickyProductTour />
      <WorkflowCanvas />
      <DifferentiationGrid />
      <PageCTA title="See the operating layer in action." body="Compile policy, evaluate drafts, repair weak outputs, and export governance packs for your AI stack." />
    </main>
  );
}
