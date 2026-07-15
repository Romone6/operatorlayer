import { Card } from "@/components/ui/card";

export function FeatureCard({ title, body }: { title: string; body: string }) {
  return <Card className="p-5"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm text-[var(--color-text-soft)]">{body}</p></Card>;
}

export function FeatureGrid() {
  const items = [
    ["Communication Intelligence", "Understand how your company communicates across channels."],
    ["Terminology Extraction", "Extract approved and forbidden phrases."],
    ["Scenario Playbooks", "Build scenario-specific response flows."],
    ["Evaluation Engine", "Score compliance, risk, tone, and next-step clarity."],
    ["Repair Loops", "Rewrite weak drafts with policy-backed guidance."],
    ["Export Packs", "Export agent-ready policy packs for existing AI tools."],
  ];
  return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{items.map(([t,b]) => <FeatureCard key={t} title={t} body={b} />)}</div>;
}

