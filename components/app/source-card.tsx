import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Source } from "@/types/source";
import { statusVariant, formatStatus } from "@/lib/view-models/status";

export function SourceCard({ source }: { source: Source }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{source.title}</h3>
          <p className="text-sm text-[var(--color-text-soft)]">{source.sourceType}</p>
        </div>
        <Badge variant={statusVariant(source.processingStatus)}>{formatStatus(source.processingStatus)}</Badge>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-[var(--color-text-soft)]">
        <p>Policies: {source.policyCount}</p>
        <p>Phrases: {source.phraseCount}</p>
        <p>Scenarios: {source.scenarioCount}</p>
      </div>
    </Card>
  );
}

