import { Card } from "@/components/ui/card";
import { RiskBadge } from "@/components/app/risk-badge";
import type { Scenario } from "@/types/scenario";

export function ScenarioCard({ scenario }: { scenario: Scenario }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{scenario.name}</h3>
        <RiskBadge risk={scenario.riskLevel} />
      </div>
      <p className="mt-2 text-sm text-[var(--color-text-soft)]">{scenario.description}</p>
      <p className="mt-2 text-xs text-[var(--color-text-muted)]">Triggers: {scenario.triggerPhrases.join(", ") || "None"}</p>
    </Card>
  );
}

