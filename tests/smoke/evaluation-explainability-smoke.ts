import { NextRequest } from "next/server";

function authedRequest(url: string, orgId: string, init: RequestInit = {}, role = "owner") {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "smoke-user-explain-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", role);
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

async function main() {
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = process.env.OPERATORLAYER_TEST_AUTH_BYPASS ?? "1";
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS ?? "1";
  process.env.OPERATORLAYER_DATA_BACKEND = process.env.OPERATORLAYER_DATA_BACKEND ?? "memory";
  process.env.OPERATORLAYER_PROCESSING_MODE = process.env.OPERATORLAYER_PROCESSING_MODE ?? "deterministic";

  const { POST: createOrganisation } = await import("@/app/api/organisations/route");
  const { POST: evaluateRepair } = await import("@/app/api/playground/evaluate-repair/route");
  const { GET: getExplainability } = await import("@/app/api/evaluations/[id]/explainability/route");
  const { resetMemoryRepository } = await import("@/lib/repository/memory");

  resetMemoryRepository();

  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "smoke-user-explain-001" },
      body: JSON.stringify({ name: "Explainability Smoke Org", industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error("Failed to create organisation for explainability smoke.");
  const org = (await create.json()) as { data: { id: string } };
  const orgId = org.data.id;

  const evaluateResponse = await evaluateRepair(
    authedRequest("http://localhost/api/playground/evaluate-repair", orgId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputMessage: "Customer asks for legal discount terms.",
        channel: "email",
        team: "sales",
        customerType: "enterprise",
        draft: "We can provide a legal discount right now.",
      }),
    })
  );
  if (!evaluateResponse.ok) throw new Error("Evaluate-repair endpoint failed in explainability smoke.");
  const evaluatePayload = (await evaluateResponse.json()) as {
    data: { evaluationRecord: { id: string } };
  };

  const explainabilityResponse = await getExplainability(
    authedRequest(`http://localhost/api/evaluations/${evaluatePayload.data.evaluationRecord.id}/explainability`, orgId),
    { params: Promise.resolve({ id: evaluatePayload.data.evaluationRecord.id }) }
  );
  if (!explainabilityResponse.ok) throw new Error("Explainability endpoint failed in smoke.");
  const explainabilityPayload = (await explainabilityResponse.json()) as {
    data: {
      evaluationId: string;
      violatedRules: Array<{ rule: string }>;
      repairTraceability: { diff: Array<{ before: string; after: string }> };
    };
  };
  if (!explainabilityPayload.data.evaluationId) throw new Error("Missing evaluationId in explainability payload.");
  if (explainabilityPayload.data.violatedRules.length < 1) {
    throw new Error("Expected violatedRules in explainability payload.");
  }
  if (explainabilityPayload.data.repairTraceability.diff.length < 1) {
    throw new Error("Expected repair diff entries in explainability payload.");
  }

  console.log("evaluation-explainability-smoke:ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
