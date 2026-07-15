import { Card } from "@/components/ui/card";

export function DocsPreviewCard({ title, body }: { title: string; body: string }) {
  return <Card className="p-4"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm text-[var(--color-text-soft)]">{body}</p></Card>;
}

export function RuleObjectPreview() {
  return (
    <Card className="p-5">
      <pre className="overflow-x-auto text-xs text-[var(--color-text-muted)]">
{`{
  "scenario": "pricing_objection",
  "required_behaviour": "Acknowledge concern and offer scoped pilot",
  "approved_phrases": ["Based on what you shared..."],
  "forbidden_phrases": ["We can definitely discount that."],
  "source_evidence": ["sales_playbook.pdf#24"],
  "confidence": 0.92,
  "human_review_conditions": ["pricing exception"]
}`}
      </pre>
    </Card>
  );
}

