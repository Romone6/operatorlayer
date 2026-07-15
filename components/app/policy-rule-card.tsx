import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ConfidenceBadge } from "@/components/app/confidence-badge";
import { RiskBadge } from "@/components/app/risk-badge";
import { StatusBadge } from "@/components/app/status-badge";
import type { Policy } from "@/types/policy";

function prettyRule(rule: Record<string, unknown>) {
  return JSON.stringify(rule, null, 2);
}

export function PolicyRuleCard({ policy }: { policy: Policy }) {
  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold">{policy.name}</h3>
        <Badge variant="violet">{policy.ruleType || "policy_rule"}</Badge>
        <StatusBadge status={policy.status} />
        <RiskBadge risk={policy.severity} />
        <ConfidenceBadge confidence={policy.confidence} />
      </div>

      <p className="text-sm text-[var(--color-text-soft)]">{policy.description}</p>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <pre className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-background-panel)]/70 p-3 text-xs text-[var(--color-text-soft)]">
          {prettyRule(policy.structuredRule)}
        </pre>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-panel)]/70 p-3 text-xs text-[var(--color-text-soft)]">
          <p className="mb-2 font-medium text-[var(--color-text-main)]">Source evidence</p>
          <ul className="space-y-1">
            {policy.sourceEvidence.length > 0 ? (
              policy.sourceEvidence.map((item, index) => (
                <li key={`${policy.id}-evidence-${index}`}>
                  {item.sourceId}
                  {item.chunkIndex !== undefined ? ` (chunk ${item.chunkIndex})` : ""}
                </li>
              ))
            ) : (
              <li>No evidence available.</li>
            )}
          </ul>
          <p className="mt-3">Reviewer: {policy.reviewedBy ?? "Not reviewed"}</p>
          <p>{policy.reviewedAt ? new Date(policy.reviewedAt).toLocaleString() : "No review timestamp"}</p>
        </div>
      </div>
    </Card>
  );
}
