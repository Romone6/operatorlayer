"use client";

import { SourceUploadForm } from "@/components/dashboard/source-upload-form";
import { SourceActions } from "@/components/dashboard/source-actions";
import { SourceCard } from "@/components/app/source-card";
import { EmptyState } from "@/components/app/empty-state";
import { LoadingState } from "@/components/app/loading-state";
import { ErrorState } from "@/components/app/error-state";
import { useApi } from "@/components/app/use-api";
import type { Source } from "@/types/source";

export default function AppSourcesPage() {
  const sources = useApi<Source[]>("/api/sources", []);
  if (sources.loading) return <LoadingState label="Loading sources..." />;
  if (sources.error) return <ErrorState message={sources.error} />;
  if (!sources.data?.length) {
    return (
      <section className="space-y-6">
        <h1 className="text-3xl font-semibold">Sources</h1>
        <SourceUploadForm />
        <EmptyState message="No sources uploaded yet." />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">Sources</h1>
      <SourceUploadForm />
      <div className="grid gap-4 lg:grid-cols-2">
        {sources.data.map((source) => (
          <div key={source.id} className="space-y-2">
            <SourceCard source={source} />
            <SourceActions sourceId={source.id} />
          </div>
        ))}
      </div>
    </section>
  );
}

