"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState } from "@/components/app/loading-state";
import { ErrorState } from "@/components/app/error-state";
import { EmptyState } from "@/components/app/empty-state";

type Detail = {
  id: string;
  name: string;
  category: string;
  description: string;
  riskLevel: string;
  tabs: {
    overview: string;
    triggerPhrases: string[];
    responseFlow: string[];
    approvedPhrases: string[];
    forbiddenPhrases: string[];
    examples: string[];
    badExamples: string[];
    approvalRules: string[];
    evaluationRubric: Record<string, number>;
  };
};

export default function ScenarioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: Detail | null }>({ loading: true, error: null, data: null });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/scenarios/${id}`)
      .then(async (response) => {
        const payload = (await response.json()) as { data?: Detail; error?: { message?: string } };
        if (!response.ok) throw new Error(payload.error?.message ?? "Failed to load scenario");
        return payload.data as Detail;
      })
      .then((data) => !cancelled && setState({ loading: false, error: null, data }))
      .catch((e) => !cancelled && setState({ loading: false, error: e instanceof Error ? e.message : "Failed to load scenario", data: null }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.loading) return <LoadingState label="Loading scenario detail..." />;
  if (state.error) return <ErrorState message={state.error} />;
  if (!state.data) return <EmptyState message="Scenario not found." />;

  const tabs = state.data.tabs;
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">{state.data.name}</h1>
      <p className="text-[var(--color-text-soft)]">{state.data.description}</p>
      <Tabs defaultValue="overview" className="space-y-3">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="triggers">Trigger Phrases</TabsTrigger>
          <TabsTrigger value="flow">Response Flow</TabsTrigger>
          <TabsTrigger value="approved">Approved Phrases</TabsTrigger>
          <TabsTrigger value="forbidden">Forbidden Phrases</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
          <TabsTrigger value="bad">Bad Examples</TabsTrigger>
          <TabsTrigger value="approval">Approval Rules</TabsTrigger>
          <TabsTrigger value="rubric">Evaluation Rubric</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><pre className="glass-card p-4 text-sm whitespace-pre-wrap">{tabs.overview}</pre></TabsContent>
        <TabsContent value="triggers"><List items={tabs.triggerPhrases} /></TabsContent>
        <TabsContent value="flow"><List items={tabs.responseFlow} /></TabsContent>
        <TabsContent value="approved"><List items={tabs.approvedPhrases} /></TabsContent>
        <TabsContent value="forbidden"><List items={tabs.forbiddenPhrases} /></TabsContent>
        <TabsContent value="examples"><List items={tabs.examples} /></TabsContent>
        <TabsContent value="bad"><List items={tabs.badExamples} /></TabsContent>
        <TabsContent value="approval"><List items={tabs.approvalRules} /></TabsContent>
        <TabsContent value="rubric"><pre className="glass-card p-4 text-xs">{JSON.stringify(tabs.evaluationRubric, null, 2)}</pre></TabsContent>
      </Tabs>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  if (!items.length) return <EmptyState message="No records yet." />;
  return (
    <ul className="glass-card list-disc space-y-2 p-4 pl-6 text-sm text-[var(--color-text-soft)]">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

