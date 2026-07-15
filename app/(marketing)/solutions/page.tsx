import { PageCTA } from "@/components/marketing/business-sections";
import { ScenarioCards } from "@/components/marketing/product-surfaces";
import { solutionMenuItems } from "@/components/marketing/operant-data";
import { Card } from "@/components/ui/card";

export default function SolutionsPage() {
  return (
    <main>
      <section className="mx-auto max-w-7xl px-5 py-20">
        <p className="section-label">Solutions</p>
        <h1 className="mt-4 max-w-5xl text-5xl font-semibold leading-tight md:text-7xl">Govern agent communication across every team that touches customers.</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--color-text-muted)]">Sales, support, customer success, operations, and enterprise AI teams can each operate with their own policies, approvals, terminology, and review gates.</p>
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-20">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {solutionMenuItems.map((item) => { const Icon = item.icon; return <Card id={item.href.split("#")[1]} key={item.title} className="p-6"><Icon className="h-5 w-5 text-[var(--color-primary-hover)]" aria-hidden="true" /><h2 className="mt-5 text-2xl font-semibold">{item.title}</h2><p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{item.description}</p></Card>; })}
        </div>
      </section>
      <ScenarioCards />
      <PageCTA title="Map your first governed workflow." body="Start with the team where agent drift, approvals, or high-risk communication creates the biggest operational cost." />
    </main>
  );
}
