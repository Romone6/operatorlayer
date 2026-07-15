import { PageCTA } from "@/components/marketing/business-sections";
import { Card } from "@/components/ui/card";

const sections = [
  ["Getting started", "Create an organisation, upload authorised sources, run extraction, and review generated policies before export."],
  ["Policy objects", "Rules include scenario, behaviour, approved phrases, forbidden phrases, evidence, confidence, status, severity, and review conditions."],
  ["Review queue", "Approve, repair, or reject agent work with policy evidence and logged decisions."],
  ["Exports", "Generate company_voice.md, communication_policy.json, scenario_playbooks.json, approval_rules.json, rubrics, and prompt packs."],
  ["Connector setup", "Provider OAuth credentials and enterprise readiness checks are required before live connector use."],
  ["Changelog", "Release notes will be published here as milestones move from planned to available."],
];

export default function DocsPage() {
  return (
    <main>
      <section className="mx-auto max-w-7xl px-5 py-20">
        <p className="section-label">Docs</p>
        <h1 className="mt-4 max-w-5xl text-5xl font-semibold leading-tight md:text-7xl">Build with Operant using explicit capability states.</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--color-text-muted)]">Documentation favours honest availability labels, runnable commands, and source-backed workflow examples over synthetic demos.</p>
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-20">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {sections.map(([title, body]) => <Card id={title.toLowerCase().replace(/\s+/g, "-")} key={title} className="p-6"><h2 className="text-2xl font-semibold">{title}</h2><p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{body}</p></Card>)}
        </div>
      </section>
      <PageCTA title="Need implementation guidance?" body="Book a demo to map the current capability surface to your AI agent workflow." />
    </main>
  );
}
