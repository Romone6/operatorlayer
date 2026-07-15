"use client";

import { useState } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { useApi } from "@/components/app/use-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type DynamicTestSuite = {
  id: string;
  generatedAt: string;
  caseCount: number;
  sourceCounts: { policies: number; scenarios: number; evaluations: number; auditFailures: number };
};

type CalibrationRecommendation = {
  id: string;
  summary: string;
  status: string;
  riskLevel: string;
  requiresHumanApproval: boolean;
  applied: boolean;
  createdAt: string;
};

export default function TestingPage() {
  const suites = useApi<DynamicTestSuite[]>("/api/test-suites", []);
  const recommendations = useApi<CalibrationRecommendation[]>("/api/calibration/recommendations", []);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loading = suites.loading || recommendations.loading;
  const loadError = suites.error ?? recommendations.error;
  if (loading) return <LoadingState label="Loading dynamic tests..." />;
  if (loadError) return <ErrorState message={loadError} />;

  async function generateSuite() {
    setWorking(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/test-suites", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Failed to generate test suite");
      await suites.refresh();
      setMessage("Dynamic test suite generated from current policies, scenarios, evaluations, and audit failures.");
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Failed to generate test suite");
    } finally {
      setWorking(false);
    }
  }

  async function runSuite(id: string) {
    setRunningId(id);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/test-suites/${id}/run`, { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: { run: { total: number; passed: number; failed: number } };
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "Failed to run suite");
      await recommendations.refresh();
      setMessage(`Run complete: ${payload.data.run.passed}/${payload.data.run.total} passed.`);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Failed to run suite");
    } finally {
      setRunningId(null);
    }
  }

  async function reviewRecommendation(id: string, status: "approved" | "rejected") {
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/calibration/recommendations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNote: "Reviewed from testing dashboard." }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Failed to review recommendation");
      await recommendations.refresh();
      setMessage(`Recommendation ${status}. No policy changes were auto-applied.`);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Failed to review recommendation");
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Dynamic testing</h1>
        <Button onClick={generateSuite} disabled={working}>
          {working ? "Generating..." : "Generate suite"}
        </Button>
      </div>
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <Card className="space-y-4 p-5">
        <h2 className="text-xl font-semibold">Generated suites</h2>
        {!suites.data?.length ? (
          <EmptyState message="No dynamic test suites generated yet." />
        ) : (
          <div className="space-y-3">
            {suites.data.map((suite) => (
              <div key={suite.id} className="rounded-lg border border-[var(--color-border-soft)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{suite.id}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                      {suite.caseCount} cases | policies {suite.sourceCounts.policies} | scenarios{" "}
                      {suite.sourceCounts.scenarios} | evaluations {suite.sourceCounts.evaluations}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => void runSuite(suite.id)} disabled={runningId === suite.id}>
                    {runningId === suite.id ? "Running..." : "Run suite"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-xl font-semibold">Calibration recommendations</h2>
        {!recommendations.data?.length ? (
          <EmptyState message="No calibration recommendations pending." />
        ) : (
          <div className="space-y-3">
            {recommendations.data.map((recommendation) => (
              <div key={recommendation.id} className="rounded-lg border border-[var(--color-border-soft)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{recommendation.summary}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                      {recommendation.riskLevel} | {recommendation.status} | applied {recommendation.applied ? "yes" : "no"}
                    </p>
                  </div>
                  {recommendation.status === "pending_approval" ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => void reviewRecommendation(recommendation.id, "approved")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => void reviewRecommendation(recommendation.id, "rejected")}>
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
