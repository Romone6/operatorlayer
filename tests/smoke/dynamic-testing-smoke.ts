import { NextRequest } from "next/server";

import type { DynamicTestSuite } from "@/lib/services/dynamic-testing";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "smoke-dynamic-owner-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  headers.set("x-user-email", "dynamic-owner@example.com");
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

async function main() {
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = process.env.OPERATORLAYER_TEST_AUTH_BYPASS ?? "1";
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS ?? "1";
  process.env.OPERATORLAYER_DATA_BACKEND = process.env.OPERATORLAYER_DATA_BACKEND ?? "memory";
  process.env.OPERATORLAYER_INLINE_JOB_RUNNER = process.env.OPERATORLAYER_INLINE_JOB_RUNNER ?? "1";
  process.env.OPERATORLAYER_PROCESSING_MODE = process.env.OPERATORLAYER_PROCESSING_MODE ?? "deterministic";

  const { POST: createOrganisation } = await import("@/app/api/organisations/route");
  const { POST: uploadSource } = await import("@/app/api/sources/upload/route");
  const { POST: generateSuite } = await import("@/app/api/test-suites/route");
  const { POST: runSuite } = await import("@/app/api/test-suites/[id]/run/route");
  const { GET: listRecommendations } = await import("@/app/api/calibration/recommendations/route");
  const { PATCH: reviewRecommendation } = await import("@/app/api/calibration/recommendations/[id]/route");
  const { getRepository } = await import("@/lib/repository");
  const { resetMemoryRepository } = await import("@/lib/repository/memory");
  const { persistDynamicTestSuite } = await import("@/lib/services/dynamic-testing");
  const { GET: listAuditEvents } = await import("@/app/api/audit/events/route");

  resetMemoryRepository();

  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "smoke-dynamic-owner-001",
        "x-user-email": "dynamic-owner@example.com",
      },
      body: JSON.stringify({ name: "Dynamic Testing Smoke Org", industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error("Failed to create organisation for dynamic testing smoke.");
  const org = (await create.json()) as { data: { id: string } };
  const orgId = org.data.id;

  const form = new FormData();
  form.set("title", "Dynamic Testing Smoke Manual");
  form.set("sourceType", "pasted_text");
  form.set("authorityLevel", "high");
  form.set(
    "pastedText",
    [
      "Pricing objection scenario. Required behaviour: acknowledge_concern, reference_customer_context, provide_policy_aligned_next_step.",
      "Approved phrase: Based on what you shared, a scoped pilot approach may make sense.",
      "Forbidden phrases: no risk at all, guaranteed discount, legal promise.",
      "Human review conditions: discounts, legal threats, refunds, and security claims.",
    ].join(" ")
  );
  const source = await uploadSource(
    authedRequest("http://localhost/api/sources/upload", orgId, {
      method: "POST",
      body: form,
    })
  );
  if (!source.ok) throw new Error("Failed to upload dynamic testing smoke source.");

  const generated = await generateSuite(
    authedRequest("http://localhost/api/test-suites", orgId, { method: "POST" })
  );
  if (!generated.ok) throw new Error("Failed to generate dynamic test suite.");
  const generatedPayload = (await generated.json()) as {
    data: DynamicTestSuite;
  };
  if (generatedPayload.data.caseCount === 0) throw new Error("Generated dynamic test suite had no cases.");
  if (generatedPayload.data.sourceCounts.policies === 0 || generatedPayload.data.sourceCounts.scenarios === 0) {
    throw new Error("Dynamic test suite was not generated from policy and scenario source material.");
  }

  const run = await runSuite(
    authedRequest(`http://localhost/api/test-suites/${generatedPayload.data.id}/run`, orgId, { method: "POST" }),
    { params: Promise.resolve({ id: generatedPayload.data.id }) }
  );
  if (!run.ok) throw new Error("Failed to run generated dynamic test suite.");
  const runPayload = (await run.json()) as {
    data: { run: { total: number; passed: number; failed: number; results: Array<{ evaluationId: string }> } };
  };
  if (runPayload.data.run.total !== generatedPayload.data.caseCount) {
    throw new Error("Dynamic test run total did not match generated case count.");
  }
  if (runPayload.data.run.results.some((result) => !result.evaluationId)) {
    throw new Error("Dynamic test run did not persist evaluation records.");
  }

  const failingSuite: DynamicTestSuite = {
    ...generatedPayload.data,
    id: "dts_smoke_forced_calibration_failure",
    caseCount: 1,
    generatedAt: new Date().toISOString(),
    generatedBy: "smoke-dynamic-owner-001",
    status: "generated" as const,
    sourceCounts: {
      ...generatedPayload.data.sourceCounts,
      evaluations: 0,
      auditFailures: 0,
    },
    cases: [
      {
        ...generatedPayload.data.cases[0],
        id: "dtc_smoke_forced_calibration_failure",
        draft: "No risk at all.",
        expectation: {
          shouldPass: true,
          minScore: 95,
          requiredOutcome: "compliant",
        },
      },
    ],
  };
  await persistDynamicTestSuite(
    getRepository(),
    orgId,
    "smoke-dynamic-owner-001",
    failingSuite
  );

  const failingRun = await runSuite(
    authedRequest(`http://localhost/api/test-suites/${failingSuite.id}/run`, orgId, { method: "POST" }),
    { params: Promise.resolve({ id: failingSuite.id }) }
  );
  if (!failingRun.ok) throw new Error("Failed to run calibration failure suite.");
  const failingRunPayload = (await failingRun.json()) as {
    data: {
      run: { status: string; failed: number };
      recommendations: Array<{ id: string; status: string; requiresHumanApproval: boolean; applied: boolean }>;
    };
  };
  if (failingRunPayload.data.run.status !== "failed" || failingRunPayload.data.run.failed !== 1) {
    throw new Error("Calibration failure suite did not produce a failed run.");
  }
  const recommendation = failingRunPayload.data.recommendations[0];
  if (!recommendation?.requiresHumanApproval || recommendation.applied || recommendation.status !== "pending_approval") {
    throw new Error("Calibration recommendation was not held for human approval.");
  }

  const reviewed = await reviewRecommendation(
    authedRequest(`http://localhost/api/calibration/recommendations/${recommendation.id}`, orgId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected", reviewNote: "Smoke rejection keeps change unapplied." }),
    }),
    { params: Promise.resolve({ id: recommendation.id }) }
  );
  if (!reviewed.ok) throw new Error("Failed to review calibration recommendation.");

  const recommendations = await listRecommendations(
    authedRequest("http://localhost/api/calibration/recommendations", orgId)
  );
  if (!recommendations.ok) throw new Error("Failed to list calibration recommendations.");
  const recommendationsPayload = (await recommendations.json()) as {
    data: Array<{ id: string; status: string; applied: boolean }>;
  };
  const reviewedRecommendation = recommendationsPayload.data.find((item) => item.id === recommendation.id);
  if (reviewedRecommendation?.status !== "rejected" || reviewedRecommendation.applied) {
    throw new Error("Reviewed calibration recommendation did not remain unapplied.");
  }

  const audit = await listAuditEvents(
    authedRequest("http://localhost/api/audit/events?limit=100&category=enterprise", orgId)
  );
  if (!audit.ok) throw new Error("Failed to list audit events for dynamic testing smoke.");
  const auditPayload = (await audit.json()) as { data: { events: Array<{ action: string }> } };
  for (const action of [
    "enterprise:dynamic_test_suite_generated",
    "enterprise:dynamic_test_run_completed",
    "enterprise:calibration_recommendation_created",
    "enterprise:calibration_recommendation_reviewed",
  ]) {
    if (!auditPayload.data.events.some((event) => event.action === action)) {
      throw new Error(`Missing audit action ${action}.`);
    }
  }

  console.log("dynamic-testing-smoke:ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
