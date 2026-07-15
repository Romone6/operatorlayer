import { NextRequest } from "next/server";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "smoke-user-closure-audit-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

async function main() {
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = process.env.OPERATORLAYER_TEST_AUTH_BYPASS ?? "1";
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS ?? "1";
  process.env.OPERATORLAYER_DATA_BACKEND = process.env.OPERATORLAYER_DATA_BACKEND ?? "memory";

  const { POST: createOrganisation } = await import("@/app/api/organisations/route");
  const { GET: getReleaseDecision } = await import("@/app/api/enterprise/release-decision/route");
  const { getRepository } = await import("@/lib/repository");
  const { resetMemoryRepository } = await import("@/lib/repository/memory");

  resetMemoryRepository();

  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "smoke-user-closure-audit-001" },
      body: JSON.stringify({ name: "Closure Audit Smoke Org", industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error("Failed to create organisation for closure-audit smoke.");
  const org = (await create.json()) as { data: { id: string } };
  const orgId = org.data.id;

  const repository = getRepository();
  const now = new Date().toISOString();
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:api_key_created",
    details: { id: "api-key-closure-smoke", actorId: "smoke-user-closure-audit-001" },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:legal_hold_placed",
    details: {
      holdId: "hold-closure-smoke",
      scope: "global",
      reason: "Retention audit",
      ticketRef: "SMOKE-001",
      actorId: "smoke-user-closure-audit-001",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:break_glass_invoked",
    details: {
      invocationId: "breakglass-closure-smoke",
      reason: "Incident containment test",
      durationMinutes: 30,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      actorId: "smoke-user-closure-audit-001",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:deletion_completed",
    details: {
      id: "deletion-closure-smoke",
      completion: {
        completedBy: "smoke-user-closure-audit-001",
        completedAt: now,
        executionMode: "soft_delete",
        proofRecordId: "proof-closure-smoke",
        deletionEvidenceHash: "hash-closure-smoke",
        deletedObjectCounts: { sources: 1, evaluations: 1, exports: 1, jobs: 1 },
        notes: null,
      },
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: "source-closure-smoke-001",
    action: "source_uploaded",
    details: {
      sourceType: "pasted_text",
      title: "Closure Evidence Source",
      authorityLevel: "standard",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: "source-closure-smoke-001",
    action: "source_process_requested",
    details: {
      sourceId: "source-closure-smoke-001",
      mode: "manual",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:approval_rule_upsert",
    details: {
      id: "approval-rule-closure-smoke-001",
      name: "Closure smoke approval boundary",
      channel: "email",
      enabled: true,
      maxRiskLevel: "low",
      mode: "manual",
      updatedBy: "smoke-user-closure-audit-001",
    },
  });
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:auto_send_decision_recorded",
    details: {
      requestKey: "closure-smoke-auto-send-decision-001",
      actorId: "smoke-user-closure-audit-001",
      decision: { allowed: true, state: "allowed", reason: "policy_matched" },
    },
  });

  const response = await getReleaseDecision(authedRequest("http://localhost/api/enterprise/release-decision", orgId));
  if (!response.ok) throw new Error("Release decision endpoint failed for closure-audit smoke.");
  const payload = (await response.json()) as {
    data: {
      compliancePosture: {
        soc2ReadinessStatus: "controls_evidenced" | "evidence_incomplete";
        missingEvidence: string[];
      };
      closureAudit: {
        requirements: Array<{
          id: string;
          status: "proved" | "blocked" | "incomplete";
          evidenceQuality: "direct" | "indirect" | "missing";
        }>;
      };
    };
  };

  if (payload.data.compliancePosture.soc2ReadinessStatus !== "controls_evidenced") {
    throw new Error("Expected SOC2 readiness posture to be controls_evidenced.");
  }
  if (payload.data.compliancePosture.missingEvidence.length > 0) {
    throw new Error("Expected no missing SOC2 evidence in closure-audit smoke scenario.");
  }

  const mustBeProved = [
    "non_negotiable_no_fake_data_integrations",
    "non_negotiable_permissioned_ingestion",
    "non_negotiable_human_governance",
    "non_negotiable_customer_owned_data_posture",
    "non_negotiable_evidence_first_outputs",
  ];
  for (const id of mustBeProved) {
    const requirement = payload.data.closureAudit.requirements.find((item) => item.id === id);
    if (!requirement) throw new Error(`Missing closure requirement ${id}.`);
    if (requirement.status !== "proved" || requirement.evidenceQuality !== "direct") {
      throw new Error(`Expected ${id} to be proved with direct evidence.`);
    }
  }

  console.log("closure-audit-evidence-smoke:ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
