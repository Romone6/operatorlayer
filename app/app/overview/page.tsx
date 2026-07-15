"use client";

import { MetricCard } from "@/components/app/metric-card";
import { EmptyState } from "@/components/app/empty-state";
import { LoadingState } from "@/components/app/loading-state";
import { ErrorState } from "@/components/app/error-state";
import { EvaluationTrendChart } from "@/components/app/evaluation-trend-chart";
import { useApi } from "@/components/app/use-api";
import type { Source } from "@/types/source";
import type { Policy } from "@/types/policy";
import type { Scenario } from "@/types/scenario";
import type { Terminology } from "@/types/terminology";
import type { Evaluation } from "@/types/evaluation";
import type { ReviewQueuePayload } from "@/types/review-queue";
import type { ExportRecord } from "@/types/export";

export default function AppOverviewPage() {
  const sources = useApi<Source[]>("/api/sources", []);
  const policies = useApi<Policy[]>("/api/policies", []);
  const scenarios = useApi<Scenario[]>("/api/scenarios", []);
  const terminology = useApi<Terminology[]>("/api/terminology", []);
  const evaluations = useApi<Evaluation[]>("/api/evaluations", []);
  const exportsData = useApi<ExportRecord[]>("/api/exports", []);
  const queue = useApi<ReviewQueuePayload>("/api/review-queue", []);

  if ([sources, policies, scenarios, terminology, evaluations, exportsData, queue].some((state) => state.loading)) return <LoadingState label="Loading overview..." />;
  const error = [sources, policies, scenarios, terminology, evaluations, exportsData, queue].map((state) => state.error).find(Boolean);
  if (error) return <ErrorState message={error} />;

  const sourceCount = sources.data?.length ?? 0;
  if (sourceCount === 0) return <EmptyState message="Upload your first source to begin building your communication layer." />;

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">Overview</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Sources uploaded" value={sourceCount} />
        <MetricCard label="Rules extracted" value={policies.data?.length ?? 0} />
        <MetricCard label="Phrases detected" value={terminology.data?.length ?? 0} />
        <MetricCard label="Scenarios created" value={scenarios.data?.length ?? 0} />
        <MetricCard label="Evaluations run" value={evaluations.data?.length ?? 0} />
        <MetricCard label="Repairs completed" value={(evaluations.data ?? []).filter((e) => Boolean(e.repairedDraft)).length} />
        <MetricCard label="Exports generated" value={exportsData.data?.length ?? 0} />
        <MetricCard label="Items needing review" value={queue.data?.summary.total ?? 0} />
      </div>
      <EvaluationTrendChart scores={(evaluations.data ?? []).map((item) => item.scores.total)} />
    </section>
  );
}

