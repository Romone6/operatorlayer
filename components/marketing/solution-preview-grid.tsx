import { Card } from "@/components/ui/card";

export function SolutionCard({ title, body }: { title: string; body: string }) {
  return <Card className="p-5"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm text-[var(--color-text-soft)]">{body}</p></Card>;
}

export function SolutionPreviewGrid() {
  const items = [
    ["Sales", "Pricing objections, discount requests, competitor comparisons."],
    ["Support", "Refund requests, legal threats, public complaint prevention."],
    ["Customer Success", "Renewal messaging and churn-risk communications."],
    ["Operations", "Cross-team consistency and governance controls."],
  ];
  return <div className="grid gap-4 md:grid-cols-2">{items.map(([t,b]) => <SolutionCard key={t} title={t} body={b} />)}</div>;
}

