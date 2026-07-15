import { Card } from "@/components/ui/card";

export function ProblemCard({ title, body }: { title: string; body: string }) {
  return <Card className="p-5"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm text-[var(--color-text-soft)]">{body}</p></Card>;
}

export function ProblemGrid() {
  const items = [
    ["Inconsistent tone and messaging", "Teams reply off-brand across channels."],
    ["Risky or non-compliant responses", "Policy and legal boundaries get missed."],
    ["Lost context across tools", "Knowledge is fragmented across docs and conversations."],
    ["Time wasted on rewrites", "Approvals and revisions slow teams down."],
  ];
  return <div className="grid gap-4 md:grid-cols-2">{items.map(([t,b]) => <ProblemCard key={t} title={t} body={b} />)}</div>;
}

