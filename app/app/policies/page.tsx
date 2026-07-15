"use client";

import { useApi } from "@/components/app/use-api";
import { PolicyRuleCard } from "@/components/app/policy-rule-card";
import { PolicyReviewActions } from "@/components/dashboard/policy-review-actions";
import { LoadingState } from "@/components/app/loading-state";
import { ErrorState } from "@/components/app/error-state";
import { EmptyState } from "@/components/app/empty-state";
import type { Policy } from "@/types/policy";

export default function PoliciesPage() {
  const policies = useApi<Policy[]>("/api/policies", []);
  if (policies.loading) return <LoadingState label="Loading policies..." />;
  if (policies.error) return <ErrorState message={policies.error} />;
  if (!policies.data?.length) return <EmptyState message="No policies extracted yet." />;

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">Policies</h1>
      {policies.data.map((policy) => (
        <div key={policy.id} className="space-y-2">
          <PolicyRuleCard policy={policy} />
          <PolicyReviewActions policyId={policy.id} />
        </div>
      ))}
    </section>
  );
}

