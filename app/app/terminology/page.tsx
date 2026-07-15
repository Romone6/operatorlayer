"use client";

import { useApi } from "@/components/app/use-api";
import { PhraseTable } from "@/components/app/phrase-table";
import { LoadingState } from "@/components/app/loading-state";
import { ErrorState } from "@/components/app/error-state";
import { EmptyState } from "@/components/app/empty-state";
import type { Terminology } from "@/types/terminology";

export default function TerminologyPage() {
  const data = useApi<Terminology[]>("/api/terminology", []);
  if (data.loading) return <LoadingState label="Loading terminology..." />;
  if (data.error) return <ErrorState message={data.error} />;
  if (!data.data?.length) return <EmptyState message="No terminology patterns extracted yet." />;

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">Terminology Intelligence</h1>
      <PhraseTable data={data.data} />
    </section>
  );
}

