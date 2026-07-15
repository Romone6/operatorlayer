import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createDeletionRequest, GET as listDeletionRequests } from "@/app/api/data-governance/deletion-requests/route";
import { POST as completeDeletionRequest } from "@/app/api/data-governance/deletion-requests/[id]/complete/route";
import { PATCH as patchGovernancePolicy } from "@/app/api/data-governance/policies/route";
import { POST as createOrganisation } from "@/app/api/organisations/route";
import { getRepository } from "@/lib/repository";
import { resetMemoryRepository } from "@/lib/repository/memory";

function authedRequest(url: string, orgId: string, init: RequestInit = {}, role = "owner") {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "test-user-delete-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", role);
  return new NextRequest(url, { ...init, headers });
}

async function createOrg() {
  const request = new NextRequest("http://localhost/api/organisations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": "test-user-delete-001",
    },
    body: JSON.stringify({ name: "Deletion Lifecycle Org", industry: "SaaS" }),
  });
  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("deletion lifecycle proof records", () => {
  beforeEach(() => {
    resetMemoryRepository();
  });

  it("captures approval, completion proof, and dependent artifact handling", async () => {
    const orgId = await createOrg();
    const repository = getRepository();
    const source = await repository.createSource({
      organisationId: orgId,
      title: "Delete Source",
      sourceType: "txt",
      rawText: "Source data",
    });
    const evaluation = await repository.createEvaluation(orgId, {
      scenarioId: null,
      inputMessage: "Input",
      originalDraft: "Original draft content for lifecycle test.",
      repairedDraft: null,
      detectedPhrases: [],
      missingRequiredElements: [],
      policyViolations: [],
      scores: {
        total: 80,
        policyCompliance: 80,
        scenarioFlow: 80,
        approvedTerminology: 80,
        forbiddenPhraseAvoidance: 80,
        toneMatch: 80,
        clarityNextStep: 80,
      },
      approvalRequired: true,
      repairRequired: false,
    });
    const exportRecord = await repository.createExport(orgId, "policy_pack", [], {
      artifactCount: 0,
      checksum: "checksum",
      signature: "signature",
      signedAt: new Date().toISOString(),
    });

    const createResponse = await createDeletionRequest(
      authedRequest("http://localhost/api/data-governance/deletion-requests", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Customer deletion request with full proof handling.",
          target: "all_data",
        }),
      })
    );
    expect(createResponse.status).toBe(201);
    const createPayload = (await createResponse.json()) as {
      data: {
        id: string;
        status: string;
        dependentArtifacts: Array<{ artifactType: string; artifactId: string }>;
      };
    };
    expect(createPayload.data.status).toBe("pending_approval");
    expect(
      createPayload.data.dependentArtifacts.some(
        (item) => item.artifactType === "source_record" && item.artifactId === source.id
      )
    ).toBe(true);
    expect(
      createPayload.data.dependentArtifacts.some(
        (item) => item.artifactType === "evaluation_record" && item.artifactId === evaluation.id
      )
    ).toBe(true);
    expect(
      createPayload.data.dependentArtifacts.some(
        (item) => item.artifactType === "export_record" && item.artifactId === exportRecord.id
      )
    ).toBe(true);

    const completionResponse = await completeDeletionRequest(
      authedRequest(
        `http://localhost/api/data-governance/deletion-requests/${createPayload.data.id}/complete`,
        orgId,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approvalTicketRef: "INC-DEL-9001",
            executionMode: "hard_delete",
            proofRecordId: "proof-del-9001",
            deletedObjectCounts: {
              sources: 1,
              evaluations: 1,
              exports: 1,
              jobs: 0,
            },
            dependentArtifactsHandled: [
              {
                artifactType: "source_record",
                artifactId: source.id,
                action: "deleted",
                reason: "Source record purged.",
              },
              {
                artifactType: "evaluation_record",
                artifactId: evaluation.id,
                action: "deleted",
                reason: "Evaluation record purged.",
              },
              {
                artifactType: "export_record",
                artifactId: exportRecord.id,
                action: "retained_legal_hold",
                reason: "Retained pending procurement evidence retention.",
              },
            ],
            notes: "Lifecycle completion test.",
          }),
        }
      ),
      { params: Promise.resolve({ id: createPayload.data.id }) }
    );
    expect(completionResponse.status).toBe(200);
    const completionPayload = (await completionResponse.json()) as {
      data: {
        status: string;
        approval: { ticketRef: string } | null;
        completion: { proofRecordId: string; deletionEvidenceHash: string } | null;
        dependentArtifacts: Array<{ handled: boolean; handledAction: string | null }>;
      };
    };
    expect(completionPayload.data.status).toBe("completed");
    expect(completionPayload.data.approval?.ticketRef).toBe("INC-DEL-9001");
    expect(completionPayload.data.completion?.proofRecordId).toBe("proof-del-9001");
    expect(completionPayload.data.completion?.deletionEvidenceHash.length).toBeGreaterThan(20);
    expect(completionPayload.data.dependentArtifacts.some((item) => item.handled)).toBe(true);
    expect(
      completionPayload.data.dependentArtifacts.some((item) => item.handledAction === "retained_legal_hold")
    ).toBe(true);

    const listResponse = await listDeletionRequests(
      authedRequest("http://localhost/api/data-governance/deletion-requests", orgId)
    );
    expect(listResponse.status).toBe(200);
    const listPayload = (await listResponse.json()) as {
      data: Array<{ id: string; status: string; completion: { proofRecordId: string } | null }>;
    };
    const resolved = listPayload.data.find((item) => item.id === createPayload.data.id);
    expect(resolved?.status).toBe("completed");
    expect(resolved?.completion?.proofRecordId).toBe("proof-del-9001");
  });

  it("blocks deletion completion when legal hold is enabled after request", async () => {
    const orgId = await createOrg();

    const createResponse = await createDeletionRequest(
      authedRequest("http://localhost/api/data-governance/deletion-requests", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Prepare request before legal hold toggle.",
          target: "sources_only",
        }),
      })
    );
    expect(createResponse.status).toBe(201);
    const createPayload = (await createResponse.json()) as { data: { id: string } };

    const policyResponse = await patchGovernancePolicy(
      authedRequest("http://localhost/api/data-governance/policies", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retentionDays: 365,
          legalHoldEnabled: true,
          deletionRequiresApproval: true,
          invitePolicy: "open",
          sessionDurationMinutes: 480,
          enforcedMfa: true,
          breakGlassAdminEnabled: true,
        }),
      })
    );
    expect(policyResponse.status).toBe(200);

    const completionResponse = await completeDeletionRequest(
      authedRequest(
        `http://localhost/api/data-governance/deletion-requests/${createPayload.data.id}/complete`,
        orgId,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approvalTicketRef: "INC-DEL-LEGAL-HOLD",
            executionMode: "soft_delete",
            proofRecordId: "proof-legal-hold-001",
            deletedObjectCounts: {
              sources: 0,
              evaluations: 0,
              exports: 0,
              jobs: 0,
            },
            dependentArtifactsHandled: [],
            notes: "Should be blocked by legal hold.",
          }),
        }
      ),
      { params: Promise.resolve({ id: createPayload.data.id }) }
    );
    expect(completionResponse.status).toBe(409);
    const payload = (await completionResponse.json()) as { error: { code: string } };
    expect(payload.error.code).toBe("legal_hold_active");
  });
});
