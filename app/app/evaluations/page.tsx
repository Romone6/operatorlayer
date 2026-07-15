"use client";

import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { EvaluationScoreCard } from "@/components/app/evaluation-score-card";
import { LoadingState } from "@/components/app/loading-state";
import { RepairDiffViewer } from "@/components/app/repair-diff-viewer";
import { StatusBadge } from "@/components/app/status-badge";
import { useApi } from "@/components/app/use-api";
import { Card } from "@/components/ui/card";
import type { Evaluation } from "@/types/evaluation";

export default function EvaluationsPage() {
  const evaluations = useApi<Evaluation[]>("/api/evaluations", []);
  if (evaluations.loading) return <LoadingState label="Loading evaluations..." />;
  if (evaluations.error) return <ErrorState message={evaluations.error} />;
  if (!evaluations.data?.length) return <EmptyState message="No evaluations have been run yet." />;

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">Evaluations</h1>

      {evaluations.data.map((item) => (
        <Card key={item.id} className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium text-[var(--color-text-main)]">
                {item.scenarioId ?? "No detected scenario"} · {new Date(item.createdAt).toLocaleString()}
              </p>
              <p className="text-xs text-[var(--color-text-soft)]">Evaluation ID: {item.id}</p>
            </div>
            <div className="flex gap-2">
              <StatusBadge status={item.repairRequired ? "needs_review" : "approved"} />
              <StatusBadge status={item.scores.riskOverride ?? "low"} />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <EvaluationScoreCard score={item.scores.total} />
            <Card className="space-y-2 p-4 text-sm text-[var(--color-text-soft)]">
              <p className="font-medium text-[var(--color-text-main)]">Approval & Repair</p>
              <p>Approval required: {item.approvalRequired ? "Yes" : "No"}</p>
              <p>
                Approval reason:{" "}
                {item.approvalRequired
                  ? item.scores.riskOverride ?? "Risk override requires human sign-off"
                  : "No risk override triggered"}
              </p>
              <p>Repair status: {item.repairRequired ? "Repair required" : "Ready"}</p>
            </Card>
            <Card className="space-y-2 p-4 text-sm text-[var(--color-text-soft)]">
              <p className="font-medium text-[var(--color-text-main)]">Violations</p>
              {item.policyViolations.length ? (
                <ul className="list-disc space-y-1 pl-4">
                  {item.policyViolations.map((violation) => (
                    <li key={`${item.id}-${violation}`}>{violation}</li>
                  ))}
                </ul>
              ) : (
                <p>No policy violations detected.</p>
              )}
            </Card>
          </div>

          <Card className="p-4 text-sm text-[var(--color-text-soft)]">
            <p className="font-medium text-[var(--color-text-main)]">Original draft</p>
            <p className="mt-2">{item.originalDraft}</p>
          </Card>

          {item.repairedDraft ? <RepairDiffViewer before={item.originalDraft} after={item.repairedDraft} /> : null}
        </Card>
      ))}
    </section>
  );
}
