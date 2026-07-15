import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createOrganisation } from "@/app/api/organisations/route";
import { POST as evaluateRepair } from "@/app/api/playground/evaluate-repair/route";
import { GET as getEvaluationExplainability } from "@/app/api/evaluations/[id]/explainability/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

function authedRequest(url: string, orgId: string, init: RequestInit = {}, role = "owner") {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "test-user-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", role);
  return new NextRequest(url, { ...init, headers });
}

async function createOrg() {
  const request = new NextRequest("http://localhost/api/organisations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": "test-user-001",
    },
    body: JSON.stringify({ name: "Explainability Org", industry: "SaaS" }),
  });
  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("evaluation explainability API", () => {
  beforeEach(() => {
    resetMemoryRepository();
    process.env.OPERATORLAYER_PROCESSING_MODE = "deterministic";
  });

  it("returns explainability pack for a saved evaluation run", async () => {
    const orgId = await createOrg();

    const evaluateResponse = await evaluateRepair(
      authedRequest("http://localhost/api/playground/evaluate-repair", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputMessage: "Customer asks for pricing discount and legal terms.",
          channel: "email",
          team: "sales",
          customerType: "enterprise",
          draft: "We can offer a legal discount immediately.",
        }),
      })
    );
    expect(evaluateResponse.status).toBe(200);
    const evaluatePayload = (await evaluateResponse.json()) as {
      data: { evaluationRecord: { id: string } };
    };
    const evaluationId = evaluatePayload.data.evaluationRecord.id;

    const explainabilityResponse = await getEvaluationExplainability(
      authedRequest(`http://localhost/api/evaluations/${evaluationId}/explainability`, orgId),
      { params: Promise.resolve({ id: evaluationId }) }
    );
    expect(explainabilityResponse.status).toBe(200);
    const explainabilityPayload = (await explainabilityResponse.json()) as {
      data: {
        evaluationId: string;
        scoringBreakdown: { total: number };
        violatedRules: Array<{ rule: string; category: string }>;
        riskOverrides: string[];
        repairTraceability: {
          beforeDraft: string;
          afterDraft: string;
          diff: Array<{ before: string; after: string }>;
          appliedRuleReferences: string[];
        };
      };
    };

    expect(explainabilityPayload.data.evaluationId).toBe(evaluationId);
    expect(typeof explainabilityPayload.data.scoringBreakdown.total).toBe("number");
    expect(explainabilityPayload.data.violatedRules.length).toBeGreaterThan(0);
    expect(explainabilityPayload.data.repairTraceability.appliedRuleReferences.length).toBeGreaterThan(0);
    expect(explainabilityPayload.data.repairTraceability.beforeDraft.length).toBeGreaterThan(0);
    expect(explainabilityPayload.data.repairTraceability.afterDraft.length).toBeGreaterThan(0);
    expect(explainabilityPayload.data.repairTraceability.diff.length).toBeGreaterThan(0);
  });
});
