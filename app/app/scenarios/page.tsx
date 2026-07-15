"use client";

import Link from "next/link";
import { useApi } from "@/components/app/use-api";
import { ScenarioCard } from "@/components/app/scenario-card";
import { LoadingState } from "@/components/app/loading-state";
import { ErrorState } from "@/components/app/error-state";
import { EmptyState } from "@/components/app/empty-state";
import type { Scenario } from "@/types/scenario";

export default function ScenariosPage() {
  const scenarios = useApi<Scenario[]>("/api/scenarios", []);
  if (scenarios.loading) return <LoadingState label="Loading scenarios..." />;
  if (scenarios.error) return <ErrorState message={scenarios.error} />;
  if (!scenarios.data?.length) return <EmptyState message="No scenarios extracted yet." />;

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">Scenarios</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        {scenarios.data.map((scenario) => <Link key={scenario.id} href={`/app/scenarios/${scenario.id}`}><ScenarioCard scenario={scenario} /></Link>)}
      </div>
    </section>
  );
}

