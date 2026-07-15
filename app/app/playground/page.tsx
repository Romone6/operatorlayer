"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { EvaluationScoreCard } from "@/components/app/evaluation-score-card";
import { RepairDiffViewer } from "@/components/app/repair-diff-viewer";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { playgroundInputSchema, type PlaygroundInputValues } from "@/lib/validators/forms";

type Result = {
  guidance: {
    scenarioName: string;
    strategy: string;
    approvedPhrases: string[];
    forbiddenPhrases: string[];
    requiredElements: string[];
    approvalRules: string[];
    evidence: Array<{ sourceType: string; sourceId: string }>;
  };
  draft: string;
  repairedDraft: string | null;
  evaluation: {
    scores: { total: number; riskOverride?: string };
    policyViolations: string[];
    missingRequiredElements: string[];
    approvalRequired: boolean;
    repairRequired: boolean;
  };
  evaluationRecord: { id: string; createdAt: string };
};

export default function PlaygroundPage() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PlaygroundInputValues>({
    resolver: zodResolver(playgroundInputSchema),
    defaultValues: {
      inputMessage: "",
      channel: "email",
      team: "sales",
      customerType: "enterprise",
      context: "",
      draft: "",
    },
  });

  async function onSubmit(values: PlaygroundInputValues) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/playground/evaluate-repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json()) as { data?: Result; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Request failed");
      setResult(payload.data ?? null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-semibold">Playground</h1>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <Card className="p-5 xl:col-span-1">
          <Form {...form}>
            <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="inputMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="channel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Channel</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="team"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer type</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="context"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Optional context</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="draft"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Optional existing AI draft</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button className="w-full" disabled={loading} type="submit">
                {loading ? "Running..." : "Generate + Evaluate + Repair"}
              </Button>
            </form>
          </Form>
          {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        </Card>

        <Card className="p-5 xl:col-span-1">
          <p className="section-label">Guidance and Draft</p>
          {!result ? (
            <p className="mt-3 text-sm text-[var(--color-text-soft)]">
              Run a message to see scenario detection, strategy, and draft output.
            </p>
          ) : (
            <div className="mt-3 space-y-3 text-sm text-[var(--color-text-soft)]">
              <p>
                <span className="text-white">Detected scenario:</span> {result.guidance.scenarioName}
              </p>
              <p>
                <span className="text-white">Recommended strategy:</span> {result.guidance.strategy}
              </p>
              <p>
                <span className="text-white">Approved phrases:</span>{" "}
                {result.guidance.approvedPhrases.join(", ") || "-"}
              </p>
              <p>
                <span className="text-white">Forbidden phrases:</span>{" "}
                {result.guidance.forbiddenPhrases.join(", ") || "-"}
              </p>
              <p>
                <span className="text-white">Required elements:</span>{" "}
                {result.guidance.requiredElements.join(", ") || "-"}
              </p>
              <p>
                <span className="text-white">Draft:</span> {result.draft}
              </p>
            </div>
          )}
        </Card>

        <Card className="p-5 xl:col-span-1">
          <p className="section-label">Applied Policies and Evidence</p>
          {!result ? (
            <p className="mt-3 text-sm text-[var(--color-text-soft)]">
              Evidence appears after evaluation.
            </p>
          ) : (
            <div className="mt-3 space-y-3 text-sm text-[var(--color-text-soft)]">
              <p>
                <span className="text-white">Approval rules:</span>{" "}
                {result.guidance.approvalRules.join(", ") || "None"}
              </p>
              <ul className="space-y-1">
                {result.guidance.evidence.map((evidence) => (
                  <li key={`${evidence.sourceType}-${evidence.sourceId}`}>
                    {evidence.sourceType}: {evidence.sourceId}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      {result ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <EvaluationScoreCard score={result.evaluation.scores.total} />
            <Card className="space-y-2 p-4 text-sm text-[var(--color-text-soft)]">
              <p className="font-medium text-[var(--color-text-main)]">Evaluation metadata</p>
              <p>
                Evaluation record: {result.evaluationRecord.id} (
                {new Date(result.evaluationRecord.createdAt).toLocaleString()})
              </p>
              <p>
                Approval required: {result.evaluation.approvalRequired ? "Yes" : "No"}{" "}
                {result.evaluation.approvalRequired ? (
                  <StatusBadge status={result.evaluation.scores.riskOverride ?? "review_required"} />
                ) : null}
              </p>
              <p>Repair status: {result.evaluation.repairRequired ? "Repair required" : "Ready"}</p>
            </Card>
          </div>

          <Card className="p-4 text-sm text-[var(--color-text-soft)]">
            <p className="font-medium text-[var(--color-text-main)]">Violations and missing elements</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {result.evaluation.policyViolations.length ? (
                result.evaluation.policyViolations.map((violation) => (
                  <li key={`violation-${violation}`}>{violation}</li>
                ))
              ) : (
                <li>No policy violations.</li>
              )}
              {result.evaluation.missingRequiredElements.length
                ? result.evaluation.missingRequiredElements.map((element) => (
                    <li key={`missing-${element}`}>Missing element: {element}</li>
                  ))
                : null}
            </ul>
          </Card>

          {result.repairedDraft ? (
            <RepairDiffViewer before={result.draft} after={result.repairedDraft} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
