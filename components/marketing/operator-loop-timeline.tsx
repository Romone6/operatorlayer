import { Card } from "@/components/ui/card";

export function OperatorLoopTimeline() {
  const steps = [
    ["1. Ingest", "Permissioned sources enter the operating layer."],
    ["2. Structure", "Rules, scenarios, terminology, and rubrics are extracted."],
    ["3. Govern", "Approval gates and boundaries are applied."],
    ["4. Improve", "Audit logs and evaluations feed back into policy."],
  ];
  return <div className="grid gap-4 md:grid-cols-4">{steps.map(([title, body]) => <Card key={title} className="p-5"><p className="text-sm font-semibold text-[var(--color-primary-hover)]">{title}</p><p className="mt-2 text-sm text-[var(--color-text-muted)]">{body}</p></Card>)}</div>;
}
