import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { GET as listAuditEvents } from "@/app/api/audit/events/route";
import { GET as listRecommendations } from "@/app/api/calibration/recommendations/route";
import { PATCH as reviewRecommendation } from "@/app/api/calibration/recommendations/[id]/route";
import { GET as listSuites, POST as generateSuite } from "@/app/api/test-suites/route";
import { POST as runSuite } from "@/app/api/test-suites/[id]/run/route";
import { POST as createOrganisation } from "@/app/api/organisations/route";
import { POST as uploadSource } from "@/app/api/sources/upload/route";
import { getRepository } from "@/lib/repository";
import { resetMemoryRepository } from "@/lib/repository/memory";
import { persistDynamicTestSuite, type DynamicTestSuite } from "@/lib/services/dynamic-testing";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "dynamic-tests-owner-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  headers.set("x-user-email", "dynamic-tests-owner@example.com");
  return new NextRequest(url, { ...init, headers });
}

async function createOrg() {
  const response = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "dynamic-tests-owner-001",
        "x-user-email": "dynamic-tests-owner@example.com",
      },
      body: JSON.stringify({ name: "Dynamic Testing Org", industry: "SaaS" }),
    })
  );
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

async function uploadPolicySource(orgId: string) {
  const form = new FormData();
  form.set("title", "Dynamic Testing Policy Manual");
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
  const response = await uploadSource(
    authedRequest("http://localhost/api/sources/upload", orgId, {
      method: "POST",
      body: form,
    })
  );
  expect(response.status).toBe(201);
}

describe("dynamic testing and calibration API", () => {
  beforeEach(() => {
    resetMemoryRepository();
    process.env.OPERATORLAYER_DATA_BACKEND = "memory";
    process.env.OPERATORLAYER_INLINE_JOB_RUNNER = "1";
    process.env.OPERATORLAYER_PROCESSING_MODE = "deterministic";
    delete process.env.OPENAI_API_KEY;
  });

  it("generates and runs policy-derived dynamic suites with audit evidence", async () => {
    const orgId = await createOrg();
    await uploadPolicySource(orgId);

    const generated = await generateSuite(
      authedRequest("http://localhost/api/test-suites", orgId, { method: "POST" })
    );
    expect(generated.status).toBe(201);
    const generatedPayload = (await generated.json()) as { data: DynamicTestSuite };
    expect(generatedPayload.data.caseCount).toBeGreaterThan(0);
    expect(generatedPayload.data.sourceCounts.policies).toBeGreaterThan(0);
    expect(generatedPayload.data.sourceCounts.scenarios).toBeGreaterThan(0);
    expect(generatedPayload.data.cases.every((testCase) => testCase.evidence.length > 0)).toBe(true);

    const listed = await listSuites(authedRequest("http://localhost/api/test-suites", orgId));
    expect(listed.status).toBe(200);
    const listedPayload = (await listed.json()) as { data: DynamicTestSuite[] };
    expect(listedPayload.data[0].id).toBe(generatedPayload.data.id);

    const run = await runSuite(
      authedRequest(`http://localhost/api/test-suites/${generatedPayload.data.id}/run`, orgId, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: generatedPayload.data.id }) }
    );
    expect(run.status).toBe(201);
    const runPayload = (await run.json()) as {
      data: { run: { total: number; passed: number; failed: number; results: Array<{ evaluationId: string }> } };
    };
    expect(runPayload.data.run.total).toBe(generatedPayload.data.caseCount);
    expect(runPayload.data.run.passed + runPayload.data.run.failed).toBe(runPayload.data.run.total);
    expect(runPayload.data.run.results.every((result) => result.evaluationId)).toBe(true);

    const audit = await listAuditEvents(
      authedRequest("http://localhost/api/audit/events?limit=100&category=enterprise", orgId)
    );
    expect(audit.status).toBe(200);
    const auditPayload = (await audit.json()) as { data: { events: Array<{ action: string }> } };
    expect(auditPayload.data.events.some((event) => event.action === "enterprise:dynamic_test_suite_generated")).toBe(
      true
    );
    expect(auditPayload.data.events.some((event) => event.action === "enterprise:dynamic_test_run_completed")).toBe(
      true
    );
  });

  it("records high-risk calibration recommendations and requires owner or admin review", async () => {
    const orgId = await createOrg();
    await uploadPolicySource(orgId);

    const generated = await generateSuite(
      authedRequest("http://localhost/api/test-suites", orgId, { method: "POST" })
    );
    expect(generated.status).toBe(201);
    const generatedPayload = (await generated.json()) as { data: DynamicTestSuite };
    const failingSuite: DynamicTestSuite = {
      ...generatedPayload.data,
      id: "dts_forced_calibration_failure",
      caseCount: 1,
      cases: [
        {
          ...generatedPayload.data.cases[0],
          id: "dtc_forced_calibration_failure",
          draft: "No risk at all.",
          expectation: {
            shouldPass: true,
            minScore: 95,
            requiredOutcome: "compliant",
          },
        },
      ],
    };
    await persistDynamicTestSuite(getRepository(), orgId, "dynamic-tests-owner-001", failingSuite);

    const run = await runSuite(
      authedRequest(`http://localhost/api/test-suites/${failingSuite.id}/run`, orgId, { method: "POST" }),
      { params: Promise.resolve({ id: failingSuite.id }) }
    );
    expect(run.status).toBe(201);
    const runPayload = (await run.json()) as {
      data: {
        run: { status: string; failed: number };
        recommendations: Array<{ id: string; status: string; requiresHumanApproval: boolean; applied: boolean }>;
      };
    };
    expect(runPayload.data.run.status).toBe("failed");
    expect(runPayload.data.run.failed).toBe(1);
    expect(runPayload.data.recommendations).toHaveLength(1);
    expect(runPayload.data.recommendations[0]).toMatchObject({
      status: "pending_approval",
      requiresHumanApproval: true,
      applied: false,
    });

    const recommendations = await listRecommendations(
      authedRequest("http://localhost/api/calibration/recommendations", orgId)
    );
    expect(recommendations.status).toBe(200);
    const recommendationsPayload = (await recommendations.json()) as {
      data: Array<{ id: string; status: string; requiresHumanApproval: boolean }>;
    };
    expect(recommendationsPayload.data[0].id).toBe(runPayload.data.recommendations[0].id);

    const reviewed = await reviewRecommendation(
      authedRequest(
        `http://localhost/api/calibration/recommendations/${runPayload.data.recommendations[0].id}`,
        orgId,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved", reviewNote: "Approved for staged review only." }),
        }
      ),
      { params: Promise.resolve({ id: runPayload.data.recommendations[0].id }) }
    );
    expect(reviewed.status).toBe(200);
    const reviewedPayload = (await reviewed.json()) as {
      data: { status: string; reviewedBy: string; reviewNote: string; applied: boolean };
    };
    expect(reviewedPayload.data.status).toBe("approved");
    expect(reviewedPayload.data.reviewedBy).toBe("dynamic-tests-owner-001");
    expect(reviewedPayload.data.reviewNote).toBe("Approved for staged review only.");
    expect(reviewedPayload.data.applied).toBe(false);
  });
});
