"use client";

import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { useApi } from "@/components/app/use-api";
import { Card } from "@/components/ui/card";
import type { SourceGovernancePayload } from "@/types/source-governance";

export default function SourceGovernancePage() {
  const governance = useApi<SourceGovernancePayload>("/api/source-governance", []);
  if (governance.loading) return <LoadingState label="Loading source governance..." />;
  if (governance.error) return <ErrorState message={governance.error} />;
  if (!governance.data) return <EmptyState message="No governance records yet." />;

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">Source Governance</h1>

      <Card className="space-y-3 p-5">
        <h2 className="text-lg font-semibold">Governed Sources</h2>
        {!governance.data.sources.length ? (
          <EmptyState message="No governed sources yet." />
        ) : (
          <ul className="space-y-2 text-sm text-[var(--color-text-soft)]">
            {governance.data.sources.map((source) => (
              <li key={source.id}>
                <span className="font-medium text-[var(--color-text-main)]">{source.title}</span> ·{" "}
                {source.sourceType} · {source.authorityLevel ?? "standard"} · {source.processingStatus}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="text-lg font-semibold">Processing Jobs</h2>
        {!governance.data.jobs.length ? (
          <EmptyState message="No processing jobs recorded." />
        ) : (
          <ul className="space-y-2 text-sm text-[var(--color-text-soft)]">
            {governance.data.jobs.slice(0, 20).map((job) => (
              <li key={job.id}>
                {job.jobType} · {job.status} · attempts {job.attempts} ·{" "}
                {new Date(job.createdAt).toLocaleString()}
                {job.errorMessage ? ` · error: ${job.errorMessage}` : ""}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="text-lg font-semibold">Ingestion Audit Log</h2>
        {!governance.data.logs.length ? (
          <EmptyState message="No ingestion audit logs recorded." />
        ) : (
          <ul className="space-y-2 text-sm text-[var(--color-text-soft)]">
            {governance.data.logs.slice(0, 30).map((log) => (
              <li key={log.id}>
                {new Date(log.createdAt).toLocaleString()} · {log.action}
                {log.sourceId ? ` · source ${log.sourceId}` : ""}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
