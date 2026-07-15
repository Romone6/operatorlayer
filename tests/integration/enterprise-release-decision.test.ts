import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { GET as getOnboardingChecklist } from "@/app/api/enterprise/onboarding-checklist/route";
import { GET as getReadinessBoard } from "@/app/api/enterprise/readiness-board/route";
import { GET as getReleaseDecision } from "@/app/api/enterprise/release-decision/route";
import { GET as getEnterpriseStatus } from "@/app/api/enterprise/status/route";
import { GET as getConnectorOauthStart } from "@/app/api/connectors/[provider]/oauth/start/route";
import { GET as getMcpAudit } from "@/app/api/mcp/audit/route";
import { POST as decideAutoSend } from "@/app/api/auto-send/decide/route";
import { POST as scimBulk } from "@/app/api/scim/v2/Bulk/route";
import { GET as startSamlLogin } from "@/app/api/saml/login/route";
import { POST as createOrganisation } from "@/app/api/organisations/route";
import { getRepository } from "@/lib/repository";
import { resetMemoryRepository } from "@/lib/repository/memory";

const CONNECTOR_PROVIDERS = ["gmail", "slack", "outlook", "hubspot", "salesforce", "intercom", "zendesk"] as const;
const REQUIRED_RELEASE_REQUIREMENT_IDS = [
  "reliability_control_plane",
  "iam_saml_scim_rbac_audit",
  "provider_deep_connectors",
  "intelligence_hardening",
  "approval_auto_send_governance",
  "billing_entitlements",
  "api_mcp_ga",
  "data_governance_security_ops",
  "enterprise_ux",
  "operational_readiness",
  "soc2_ready_architecture_evidence",
  "no_unsupported_certification_claims",
  "runtime_disabled_unsupported_capabilities",
  "non_negotiable_no_fake_data_integrations",
  "non_negotiable_permissioned_ingestion",
  "non_negotiable_human_governance",
  "non_negotiable_customer_owned_data_posture",
  "non_negotiable_evidence_first_outputs",
] as const;

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
    body: JSON.stringify({ name: "Release Decision Org", industry: "SaaS" }),
  });
  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("enterprise release decision API", () => {
  beforeEach(() => {
    resetMemoryRepository();
  });

  it("returns a single integrated decision with fail-closed closure semantics and aligned snapshots", async () => {
    const orgId = await createOrg();

    const [releaseDecisionResponse, boardResponse, checklistResponse, statusResponse] = await Promise.all([
      getReleaseDecision(authedRequest("http://localhost/api/enterprise/release-decision", orgId)),
      getReadinessBoard(authedRequest("http://localhost/api/enterprise/readiness-board", orgId)),
      getOnboardingChecklist(authedRequest("http://localhost/api/enterprise/onboarding-checklist", orgId)),
      getEnterpriseStatus(authedRequest("http://localhost/api/enterprise/status", orgId)),
    ]);
    expect(releaseDecisionResponse.status).toBe(200);
    expect(boardResponse.status).toBe(200);
    expect(checklistResponse.status).toBe(200);
    expect(statusResponse.status).toBe(200);

    const releaseDecisionPayload = (await releaseDecisionResponse.json()) as {
      data: {
        decision: "go" | "no_go";
        summary: {
          hardBlockerCount: number;
          blockerCount: number;
          readinessCompletionPct: number;
          unavailableCapabilityCount: number;
          blockedDomainCount: number;
          verificationGapDomainCount: number;
        };
        nextActions: string[];
        evidenceSignals: {
          auditEvents: { total: number; governance: number; security: number };
          intelligence: { evaluations: number; reviewEvents: number; policies: number; scenarios: number };
          governanceLifecycles: { legalHoldEvents: number; breakGlassEvents: number; deletionEvents: number };
          autoSend: { decisionEvents: number; sendEventsCreated: number; sendEventsDelivered: number };
        };
        compliancePosture: {
          certificationClaim: "not_claimed";
          soc2ReadinessStatus: "controls_evidenced" | "evidence_incomplete";
          procurementDocs: {
            architectureBrief: boolean;
            securityQuestionnaireBaseline: boolean;
            connectorScopeMatrix: boolean;
            governanceWalkthrough: boolean;
          };
          missingEvidence: string[];
        };
        closureAudit: {
          summary: { total: number; proved: number; blocked: number; incomplete: number };
          requirements: Array<{
            id: string;
            status: "proved" | "blocked" | "incomplete";
            evidenceQuality: "direct" | "indirect" | "missing";
            gaps: string[];
            nextActions: string[];
          }>;
        };
        objectiveCoverage: Array<{
          id: string;
          scope: "domain" | "compliance" | "runtime_safety" | "non_negotiable";
          status: "proved" | "blocked" | "incomplete";
          evidenceSources: string[];
          gaps: string[];
          nextActions: string[];
        }>;
        readinessBoard: { goNoGo: "go" | "no_go"; blockers: Array<{ code: string }> };
        onboardingChecklist: { goNoGo: "go" | "no_go"; readinessMeter: { completionPct: number } };
        capabilityStatus: { capabilityStates: Array<{ id: string; state: "available" | "unavailable" }> };
        unavailableCapabilities: Array<{ id: string; reason: string; message: string }>;
        domainAssessments: Array<{
          id: string;
          status: "ready" | "blocked" | "verification_gap";
          blockingCodes: string[];
          nextActions: string[];
        }>;
      };
    };
    const boardPayload = (await boardResponse.json()) as {
      data: {
        goNoGo: "go" | "no_go";
        hardBlockerCount: number;
        blockers: Array<{ code: string }>;
      };
    };
    const checklistPayload = (await checklistResponse.json()) as {
      data: {
        goNoGo: "go" | "no_go";
        readinessMeter: { completionPct: number };
      };
    };
    const statusPayload = (await statusResponse.json()) as {
      data: {
        capabilityStates: Array<{ id: string; state: "available" | "unavailable" }>;
      };
    };

    expect(releaseDecisionPayload.data.readinessBoard.goNoGo).toBe(boardPayload.data.goNoGo);
    expect(releaseDecisionPayload.data.onboardingChecklist.goNoGo).toBe(checklistPayload.data.goNoGo);
    if (boardPayload.data.goNoGo === "no_go") {
      expect(releaseDecisionPayload.data.decision).toBe("no_go");
    }
    expect(releaseDecisionPayload.data.summary.hardBlockerCount).toBe(boardPayload.data.hardBlockerCount);
    expect(releaseDecisionPayload.data.summary.blockerCount).toBe(boardPayload.data.blockers.length);
    expect(releaseDecisionPayload.data.summary.readinessCompletionPct).toBe(
      checklistPayload.data.readinessMeter.completionPct
    );
    expect(releaseDecisionPayload.data.capabilityStatus.capabilityStates.length).toBe(
      statusPayload.data.capabilityStates.length
    );

    const unavailableFromStatus = statusPayload.data.capabilityStates.filter(
      (item) => item.state === "unavailable"
    ).length;
    expect(releaseDecisionPayload.data.summary.unavailableCapabilityCount).toBe(unavailableFromStatus);
    expect(releaseDecisionPayload.data.unavailableCapabilities.length).toBe(unavailableFromStatus);
    expect(releaseDecisionPayload.data.nextActions.length).toBeGreaterThan(0);
    expect(releaseDecisionPayload.data.evidenceSignals.auditEvents.total).toBeGreaterThanOrEqual(0);
    expect(releaseDecisionPayload.data.evidenceSignals.intelligence.evaluations).toBeGreaterThanOrEqual(0);
    expect(releaseDecisionPayload.data.compliancePosture.certificationClaim).toBe("not_claimed");
    expect(releaseDecisionPayload.data.compliancePosture.soc2ReadinessStatus).toBe("evidence_incomplete");
    expect(releaseDecisionPayload.data.compliancePosture.procurementDocs.architectureBrief).toBe(true);
    expect(releaseDecisionPayload.data.compliancePosture.procurementDocs.securityQuestionnaireBaseline).toBe(true);
    expect(releaseDecisionPayload.data.compliancePosture.procurementDocs.connectorScopeMatrix).toBe(true);
    expect(releaseDecisionPayload.data.compliancePosture.procurementDocs.governanceWalkthrough).toBe(true);
    expect(releaseDecisionPayload.data.compliancePosture.missingEvidence.length).toBeGreaterThan(0);
    expect(releaseDecisionPayload.data.closureAudit.summary.total).toBe(18);
    expect(
      releaseDecisionPayload.data.closureAudit.summary.proved +
        releaseDecisionPayload.data.closureAudit.summary.blocked +
        releaseDecisionPayload.data.closureAudit.summary.incomplete
    ).toBe(releaseDecisionPayload.data.closureAudit.summary.total);
    expect(releaseDecisionPayload.data.closureAudit.requirements.length).toBe(
      releaseDecisionPayload.data.closureAudit.summary.total
    );
    expect(releaseDecisionPayload.data.objectiveCoverage.length).toBe(
      releaseDecisionPayload.data.closureAudit.summary.total
    );
    expect(
      releaseDecisionPayload.data.closureAudit.requirements.every((item) =>
        ["direct", "indirect", "missing"].includes(item.evidenceQuality)
      )
    ).toBe(true);
    expect(
      releaseDecisionPayload.data.objectiveCoverage.every((item) =>
        ["domain", "compliance", "runtime_safety", "non_negotiable"].includes(item.scope)
      )
    ).toBe(true);
    expect(
      releaseDecisionPayload.data.closureAudit.requirements
        .filter((item) => item.status === "proved")
        .every((item) => item.evidenceQuality !== "missing")
    ).toBe(true);
    const objectiveCoverageIds = releaseDecisionPayload.data.objectiveCoverage.map((item) => item.id);
    const uniqueObjectiveCoverageIds = Array.from(new Set(objectiveCoverageIds));
    expect(uniqueObjectiveCoverageIds.length).toBe(objectiveCoverageIds.length);
    expect(uniqueObjectiveCoverageIds.sort()).toEqual([...REQUIRED_RELEASE_REQUIREMENT_IDS].sort());
    const closureRequirementIds = releaseDecisionPayload.data.closureAudit.requirements.map((item) => item.id);
    expect([...new Set(closureRequirementIds)].sort()).toEqual(uniqueObjectiveCoverageIds.sort());
    const closureById = new Map(
      releaseDecisionPayload.data.closureAudit.requirements.map((item) => [item.id, item] as const)
    );
    for (const objective of releaseDecisionPayload.data.objectiveCoverage) {
      const requirement = closureById.get(objective.id);
      expect(requirement, `missing closure requirement for objective ${objective.id}`).toBeDefined();
      expect(objective.status).toBe(requirement?.status);
      expect(objective.gaps).toEqual(requirement?.gaps ?? []);
      expect(objective.nextActions).toEqual(requirement?.nextActions ?? []);
      expect(objective.evidenceSources.length).toBeGreaterThan(0);
      if (objective.status !== "proved") {
        expect(objective.gaps.length).toBeGreaterThan(0);
        expect(objective.nextActions.length).toBeGreaterThan(0);
      }
    }
    expect(
      releaseDecisionPayload.data.objectiveCoverage.some(
        (item) => item.id === "runtime_disabled_unsupported_capabilities" && item.scope === "runtime_safety"
      )
    ).toBe(true);
    expect(
      releaseDecisionPayload.data.objectiveCoverage.some(
        (item) => item.id === "soc2_ready_architecture_evidence" && item.scope === "compliance"
      )
    ).toBe(true);
    expect(
      releaseDecisionPayload.data.objectiveCoverage.some(
        (item) => item.id === "non_negotiable_human_governance" && item.scope === "non_negotiable"
      )
    ).toBe(true);
    expect(
      releaseDecisionPayload.data.objectiveCoverage.some(
        (item) => item.id === "provider_deep_connectors" && item.scope === "domain"
      )
    ).toBe(true);
    const shouldBeGo =
      boardPayload.data.goNoGo === "go" &&
      releaseDecisionPayload.data.closureAudit.summary.blocked === 0 &&
      releaseDecisionPayload.data.closureAudit.summary.incomplete === 0;
    expect(releaseDecisionPayload.data.decision).toBe(shouldBeGo ? "go" : "no_go");

    expect(releaseDecisionPayload.data.domainAssessments).toHaveLength(10);
    const blockedDomains = releaseDecisionPayload.data.domainAssessments.filter((item) => item.status === "blocked");
    const verificationGapDomains = releaseDecisionPayload.data.domainAssessments.filter(
      (item) => item.status === "verification_gap"
    );
    expect(releaseDecisionPayload.data.summary.blockedDomainCount).toBe(blockedDomains.length);
    expect(releaseDecisionPayload.data.summary.verificationGapDomainCount).toBe(verificationGapDomains.length);
    expect(blockedDomains.length).toBeGreaterThan(0);

    const iamDomain = releaseDecisionPayload.data.domainAssessments.find((item) => item.id === "iam_saml_scim_rbac_audit");
    expect(iamDomain).toBeDefined();
    expect(iamDomain?.status).toBe("blocked");

    const intelligenceDomain = releaseDecisionPayload.data.domainAssessments.find(
      (item) => item.id === "intelligence_hardening"
    );
    expect(intelligenceDomain).toBeDefined();
    expect(intelligenceDomain?.status).toBe("verification_gap");

    const noClaimRequirement = releaseDecisionPayload.data.closureAudit.requirements.find(
      (item) => item.id === "no_unsupported_certification_claims"
    );
    expect(noClaimRequirement?.status).toBe("proved");
    expect(noClaimRequirement?.evidenceQuality).toBe("direct");

    const soc2EvidenceRequirement = releaseDecisionPayload.data.closureAudit.requirements.find(
      (item) => item.id === "soc2_ready_architecture_evidence"
    );
    expect(soc2EvidenceRequirement).toBeDefined();
    expect(soc2EvidenceRequirement?.status).toBe("incomplete");
    expect(soc2EvidenceRequirement?.evidenceQuality).toBe("indirect");

    const noFakeIntegrationsRequirement = releaseDecisionPayload.data.closureAudit.requirements.find(
      (item) => item.id === "non_negotiable_no_fake_data_integrations"
    );
    expect(noFakeIntegrationsRequirement).toBeDefined();
    expect(noFakeIntegrationsRequirement?.status).toBe("proved");
    expect(noFakeIntegrationsRequirement?.evidenceQuality).toBe("direct");

    const nonNegotiableIds = [
      "non_negotiable_no_fake_data_integrations",
      "non_negotiable_permissioned_ingestion",
      "non_negotiable_human_governance",
      "non_negotiable_customer_owned_data_posture",
      "non_negotiable_evidence_first_outputs",
    ];
    for (const id of nonNegotiableIds) {
      expect(releaseDecisionPayload.data.closureAudit.requirements.some((item) => item.id === id)).toBe(true);
    }
  });

  it("requires connector, mcp, auto-send, SCIM, and SAML runtime-denial evidence before proving runtime-disabled unsupported capabilities", async () => {
    const orgId = await createOrg();
    const previousScimToken = process.env.OPERATORLAYER_SCIM_TOKEN;
    process.env.OPERATORLAYER_SCIM_TOKEN = "release-decision-runtime-proof-scim-token";
    try {

    const firstDecision = await getReleaseDecision(authedRequest("http://localhost/api/enterprise/release-decision", orgId));
    expect(firstDecision.status).toBe(200);
    const firstPayload = (await firstDecision.json()) as {
      data: {
        unavailableCapabilities: Array<{ id: string; reason: string; message: string }>;
        closureAudit: {
          requirements: Array<{
            id: string;
            status: "proved" | "blocked" | "incomplete";
            gaps: string[];
            evidenceSources: string[];
          }>;
        };
      };
    };
    const firstRuntimeDisabledRequirement = firstPayload.data.closureAudit.requirements.find(
      (item) => item.id === "runtime_disabled_unsupported_capabilities"
    );
    expect(firstRuntimeDisabledRequirement).toBeDefined();
    expect(firstRuntimeDisabledRequirement?.status).toBe("incomplete");
    expect(firstRuntimeDisabledRequirement?.gaps).toContain("connector_runtime_disable_proof_missing");
    expect(firstRuntimeDisabledRequirement?.gaps).toContain("connector_runtime_disable_proof_missing_connector_gmail");
    expect(firstRuntimeDisabledRequirement?.gaps).toContain("connector_runtime_disable_proof_missing_connector_zendesk");
    expect(firstRuntimeDisabledRequirement?.gaps).toContain("mcp_runtime_disable_proof_missing");
    expect(firstRuntimeDisabledRequirement?.gaps).toContain("auto_send_runtime_disable_proof_missing");
    expect(firstRuntimeDisabledRequirement?.gaps).toContain("scim_runtime_disable_proof_missing");
    expect(firstRuntimeDisabledRequirement?.gaps).toContain("saml_runtime_disable_proof_missing");
    expect(firstRuntimeDisabledRequirement?.evidenceSources).toContain("connector_runtime_denials=0");
    expect(firstRuntimeDisabledRequirement?.evidenceSources).toContain("mcp_runtime_denials=0");
    expect(firstRuntimeDisabledRequirement?.evidenceSources).toContain("auto_send_runtime_denials=0");
    expect(firstRuntimeDisabledRequirement?.evidenceSources).toContain("scim_runtime_denials=0");
    expect(firstRuntimeDisabledRequirement?.evidenceSources).toContain("saml_runtime_denials=0");
    expect(firstPayload.data.unavailableCapabilities.length).toBeGreaterThan(0);
    expect(
      firstPayload.data.unavailableCapabilities.every(
        (item) => item.reason.trim().length > 0 && item.message.trim().length > 0
      )
    ).toBe(true);
    expect(firstPayload.data.unavailableCapabilities.some((item) => item.id.startsWith("connector_"))).toBe(true);

    for (const provider of CONNECTOR_PROVIDERS) {
      const oauthStartResponse = await getConnectorOauthStart(
        authedRequest(
          `http://localhost/api/connectors/${provider}/oauth/start?redirectUri=http%3A%2F%2Flocalhost%3A3000%2Fapp%2Fsettings`,
          orgId
        ),
        { params: Promise.resolve({ provider }) }
      );
      expect(oauthStartResponse.status).toBe(409);
    }
    const mcpAuditResponse = await getMcpAudit(
      new NextRequest("http://localhost/api/mcp/audit", {
        headers: {
          "x-user-id": "test-user-001",
          "x-org-id": orgId,
          "x-user-role": "admin",
          "x-user-capabilities": "api-admin",
        },
      })
    );
    expect(mcpAuditResponse.status).toBe(409);
    const autoSendDenied = await decideAutoSend(
      authedRequest("http://localhost/api/auto-send/decide", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: 96,
          riskLevel: "low",
          channel: "email",
          customerType: "smb",
          workspaceId: "runtime-proof-workspace",
          draft: "Draft for runtime deny evidence.",
          recipient: "runtime-proof@example.com",
          evidence: ["runtime_denial_auto_send"],
        }),
      })
    );
    expect(autoSendDenied.status).toBe(200);
    const autoSendDeniedPayload = (await autoSendDenied.json()) as {
      data: { decision: { allowed: boolean; runtimeUnavailable?: { capabilityId: string; reason: string } | null } };
    };
    expect(autoSendDeniedPayload.data.decision.allowed).toBe(false);
    expect(autoSendDeniedPayload.data.decision.runtimeUnavailable?.capabilityId).toBe("auto_send");
    const scimDenied = await scimBulk(
      new NextRequest("http://localhost/api/scim/v2/Bulk", {
        method: "POST",
        headers: {
          Authorization: "Bearer release-decision-runtime-proof-scim-token",
          "x-ol-org-id": orgId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schemas: ["urn:ietf:params:scim:api:messages:2.0:BulkRequest"],
          Operations: [{ method: "POST", path: "/Users", bulkId: "runtime-proof-scim", data: { emails: [] } }],
        }),
      })
    );
    expect(scimDenied.status).toBe(409);
    const scimDeniedPayload = (await scimDenied.json()) as { error: { code: string } };
    expect(scimDeniedPayload.error.code).toBe("scim_write_unavailable");
    const samlDenied = await startSamlLogin(new NextRequest(`http://localhost/api/saml/login?orgId=${orgId}`));
    expect(samlDenied.status).toBe(409);
    const samlDeniedPayload = (await samlDenied.json()) as { error: { code: string } };
    expect(samlDeniedPayload.error.code).toBe("saml_not_enabled");

    const secondDecision = await getReleaseDecision(authedRequest("http://localhost/api/enterprise/release-decision", orgId));
    expect(secondDecision.status).toBe(200);
    const secondPayload = (await secondDecision.json()) as {
      data: {
        unavailableCapabilities: Array<{ id: string; reason: string; message: string }>;
        closureAudit: {
          requirements: Array<{
            id: string;
            status: "proved" | "blocked" | "incomplete";
            gaps: string[];
            evidenceSources: string[];
          }>;
        };
      };
    };
    const secondRuntimeDisabledRequirement = secondPayload.data.closureAudit.requirements.find(
      (item) => item.id === "runtime_disabled_unsupported_capabilities"
    );
    expect(secondRuntimeDisabledRequirement).toBeDefined();
    expect(secondRuntimeDisabledRequirement?.status).toBe("proved");
    expect(secondRuntimeDisabledRequirement?.gaps).toHaveLength(0);
    expect(secondRuntimeDisabledRequirement?.evidenceSources).toContain(
      `connector_runtime_denials=${CONNECTOR_PROVIDERS.length}`
    );
    expect(secondRuntimeDisabledRequirement?.evidenceSources).toContain("mcp_runtime_denials=1");
    expect(secondRuntimeDisabledRequirement?.evidenceSources).toContain("auto_send_runtime_denials=1");
    expect(secondRuntimeDisabledRequirement?.evidenceSources).toContain("scim_runtime_denials=1");
    expect(secondRuntimeDisabledRequirement?.evidenceSources).toContain("saml_runtime_denials=1");
    expect(secondPayload.data.unavailableCapabilities.length).toBeGreaterThan(0);
    expect(
      secondPayload.data.unavailableCapabilities.every(
        (item) => item.reason.trim().length > 0 && item.message.trim().length > 0
      )
    ).toBe(true);
    expect(secondPayload.data.unavailableCapabilities.some((item) => item.id.startsWith("connector_"))).toBe(true);
    } finally {
      if (previousScimToken === undefined) {
        delete process.env.OPERATORLAYER_SCIM_TOKEN;
      } else {
        process.env.OPERATORLAYER_SCIM_TOKEN = previousScimToken;
      }
    }
  });

  it("proves governance-linked non-negotiables when direct lifecycle evidence is present", async () => {
    const orgId = await createOrg();
    const repository = getRepository();
    const now = new Date().toISOString();

    await repository.createIngestionLog({
      organisationId: orgId,
      sourceId: null,
      action: "enterprise:api_key_created",
      details: { id: "api-key-001", actorId: "test-user-001" },
    });
    await repository.createIngestionLog({
      organisationId: orgId,
      sourceId: null,
      action: "enterprise:legal_hold_placed",
      details: {
        holdId: "hold-001",
        scope: "global",
        reason: "Retention investigation",
        ticketRef: "TICKET-001",
        actorId: "test-user-001",
      },
    });
    await repository.createIngestionLog({
      organisationId: orgId,
      sourceId: null,
      action: "enterprise:break_glass_invoked",
      details: {
        invocationId: "breakglass-001",
        reason: "Incident containment",
        durationMinutes: 30,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        actorId: "test-user-001",
      },
    });
    await repository.createIngestionLog({
      organisationId: orgId,
      sourceId: null,
      action: "enterprise:deletion_completed",
      details: {
        id: "deletion-001",
        completion: {
          completedBy: "test-user-001",
          completedAt: now,
          executionMode: "soft_delete",
          proofRecordId: "proof-001",
          deletionEvidenceHash: "hash-001",
          deletedObjectCounts: { sources: 1, evaluations: 1, exports: 1, jobs: 1 },
          notes: null,
        },
      },
    });
    await repository.createIngestionLog({
      organisationId: orgId,
      sourceId: "source-001",
      action: "source_uploaded",
      details: {
        sourceType: "pasted_text",
        title: "Governance Evidence Source",
        authorityLevel: "standard",
      },
    });
    await repository.createIngestionLog({
      organisationId: orgId,
      sourceId: "source-001",
      action: "source_process_requested",
      details: {
        sourceId: "source-001",
        mode: "manual",
      },
    });
    await repository.createIngestionLog({
      organisationId: orgId,
      sourceId: null,
      action: "enterprise:approval_rule_upsert",
      details: {
        id: "approval-rule-001",
        name: "Governance approval boundary",
        channel: "email",
        enabled: true,
        maxRiskLevel: "low",
        minScore: 90,
        updatedBy: "test-user-001",
      },
    });
    await repository.createIngestionLog({
      organisationId: orgId,
      sourceId: null,
      action: "enterprise:auto_send_decision_recorded",
      details: {
        requestKey: "governance-proof-request-001",
        actorId: "test-user-001",
        decision: { allowed: true, state: "allowed", reason: "policy_matched" },
      },
    });

    const releaseDecisionResponse = await getReleaseDecision(
      authedRequest("http://localhost/api/enterprise/release-decision", orgId)
    );
    expect(releaseDecisionResponse.status).toBe(200);
    const payload = (await releaseDecisionResponse.json()) as {
      data: {
        compliancePosture: {
          soc2ReadinessStatus: "controls_evidenced" | "evidence_incomplete";
          missingEvidence: string[];
        };
        domainAssessments: Array<{
          id: string;
          status: "ready" | "blocked" | "verification_gap";
          blockingCodes: string[];
        }>;
        closureAudit: {
          requirements: Array<{
            id: string;
            status: "proved" | "blocked" | "incomplete";
            evidenceQuality: "direct" | "indirect" | "missing";
          }>;
        };
      };
    };

    expect(payload.data.compliancePosture.soc2ReadinessStatus).toBe("controls_evidenced");
    expect(payload.data.compliancePosture.missingEvidence).toHaveLength(0);

    const permissionedIngestion = payload.data.closureAudit.requirements.find(
      (item) => item.id === "non_negotiable_permissioned_ingestion"
    );
    const humanGovernance = payload.data.closureAudit.requirements.find(
      (item) => item.id === "non_negotiable_human_governance"
    );
    const customerOwnedData = payload.data.closureAudit.requirements.find(
      (item) => item.id === "non_negotiable_customer_owned_data_posture"
    );
    const evidenceFirstOutputs = payload.data.closureAudit.requirements.find(
      (item) => item.id === "non_negotiable_evidence_first_outputs"
    );

    expect(permissionedIngestion?.status).toBe("proved");
    expect(permissionedIngestion?.evidenceQuality).toBe("direct");
    expect(humanGovernance?.status).toBe("proved");
    expect(humanGovernance?.evidenceQuality).toBe("direct");
    expect(customerOwnedData?.status).toBe("proved");
    expect(customerOwnedData?.evidenceQuality).toBe("direct");
    expect(evidenceFirstOutputs?.status).toBe("proved");
    expect(evidenceFirstOutputs?.evidenceQuality).toBe("direct");

    const governanceOpsDomain = payload.data.domainAssessments.find(
      (item) => item.id === "data_governance_security_ops"
    );
    expect(governanceOpsDomain).toBeDefined();
    expect(governanceOpsDomain?.status).toBe("ready");
    expect(governanceOpsDomain?.blockingCodes).toHaveLength(0);

    const governanceOpsRequirement = payload.data.closureAudit.requirements.find(
      (item) => item.id === "data_governance_security_ops"
    );
    expect(governanceOpsRequirement).toBeDefined();
    expect(governanceOpsRequirement?.status).toBe("proved");
  });

  it("marks provider-deep connectors as verification_gap when connected providers lack successful sync evidence", async () => {
    const orgId = await createOrg();
    const repository = getRepository();

    const envKeys = [
      "OPENAI_API_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "SLACK_CLIENT_ID",
      "SLACK_CLIENT_SECRET",
      "MICROSOFT_CLIENT_ID",
      "MICROSOFT_CLIENT_SECRET",
      "HUBSPOT_CLIENT_ID",
      "HUBSPOT_CLIENT_SECRET",
      "SALESFORCE_CLIENT_ID",
      "SALESFORCE_CLIENT_SECRET",
      "INTERCOM_CLIENT_ID",
      "INTERCOM_CLIENT_SECRET",
      "ZENDESK_CLIENT_ID",
      "ZENDESK_CLIENT_SECRET",
      "ZENDESK_AUTHORIZE_URL",
      "ZENDESK_TOKEN_URL",
      "ZENDESK_API_BASE_URL",
      "OPERATORLAYER_SCIM_TOKEN",
      "OPERATORLAYER_OAUTH_STATE_SECRET",
    ] as const;
    const previousValues = Object.fromEntries(envKeys.map((key) => [key, process.env[key]])) as Record<
      (typeof envKeys)[number],
      string | undefined
    >;

    try {
      process.env.OPENAI_API_KEY = "release-decision-test-openai";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://release-decision-test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "release-decision-test-anon";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "release-decision-test-service-role";
      process.env.GOOGLE_CLIENT_ID = "release-decision-test-google-id";
      process.env.GOOGLE_CLIENT_SECRET = "release-decision-test-google-secret";
      process.env.SLACK_CLIENT_ID = "release-decision-test-slack-id";
      process.env.SLACK_CLIENT_SECRET = "release-decision-test-slack-secret";
      process.env.MICROSOFT_CLIENT_ID = "release-decision-test-ms-id";
      process.env.MICROSOFT_CLIENT_SECRET = "release-decision-test-ms-secret";
      process.env.HUBSPOT_CLIENT_ID = "release-decision-test-hubspot-id";
      process.env.HUBSPOT_CLIENT_SECRET = "release-decision-test-hubspot-secret";
      process.env.SALESFORCE_CLIENT_ID = "release-decision-test-salesforce-id";
      process.env.SALESFORCE_CLIENT_SECRET = "release-decision-test-salesforce-secret";
      process.env.INTERCOM_CLIENT_ID = "release-decision-test-intercom-id";
      process.env.INTERCOM_CLIENT_SECRET = "release-decision-test-intercom-secret";
      process.env.ZENDESK_CLIENT_ID = "release-decision-test-zendesk-id";
      process.env.ZENDESK_CLIENT_SECRET = "release-decision-test-zendesk-secret";
      process.env.ZENDESK_AUTHORIZE_URL = "https://release-decision-test.zendesk.com/oauth/authorizations/new";
      process.env.ZENDESK_TOKEN_URL = "https://release-decision-test.zendesk.com/oauth/tokens";
      process.env.ZENDESK_API_BASE_URL = "https://release-decision-test.zendesk.com/api/v2";
      process.env.OPERATORLAYER_SCIM_TOKEN = "release-decision-test-scim-token";
      process.env.OPERATORLAYER_OAUTH_STATE_SECRET = "release-decision-test-oauth-state-secret";

      for (const key of [
        "auto_send",
        "scim_write",
        "connector_gmail",
        "connector_slack",
        "connector_outlook",
        "connector_hubspot",
        "connector_salesforce",
        "connector_intercom",
        "connector_zendesk",
        "mcp_actions",
      ] as const) {
        await repository.createIngestionLog({
          organisationId: orgId,
          sourceId: null,
          action: "enterprise:feature_flag_upsert",
          details: {
            key,
            enabled: true,
            rolloutPercent: 100,
            updatedBy: "test-user-001",
          },
        });
      }

      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: null,
        action: "enterprise:billing_entitlement_upsert",
        details: {
          organisationId: orgId,
          plan: "enterprise",
          seatsLimit: 100,
          evaluationsMonthlyLimit: 10000,
          sourcesMonthlyLimit: 1000,
          connectorLimit: 20,
          autoSendEnabled: true,
          apiAccessEnabled: true,
          mcpAccessEnabled: true,
          status: "active",
          updatedAt: new Date().toISOString(),
        },
      });
      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: null,
        action: "enterprise:sso_config_upsert",
        details: {
          enabled: true,
          idpEntityId: "https://idp.example.com/entity",
          ssoUrl: "https://idp.example.com/saml",
          certificateFingerprint: "AA:BB:CC:DD:EE:FF:11:22",
          metadataSource: "manual",
          updatedAt: new Date().toISOString(),
        },
      });

      for (const provider of ["gmail", "slack", "outlook", "hubspot", "salesforce", "intercom", "zendesk"] as const) {
        await repository.createIngestionLog({
          organisationId: orgId,
          sourceId: null,
          action: "enterprise:connector_upsert",
          details: {
            provider,
            status: "connected",
            displayName: provider.toUpperCase(),
            scopes: ["read"],
            sourceSelection: ["all"],
            syncSchedule: "hourly",
            actorId: "test-user-001",
          },
        });
      }

      const response = await getReleaseDecision(authedRequest("http://localhost/api/enterprise/release-decision", orgId));
      expect(response.status).toBe(200);
      const payload = (await response.json()) as {
        data: {
          decision: "go" | "no_go";
          readinessBoard: { goNoGo: "go" | "no_go" };
          domainAssessments: Array<{
            id: string;
            status: "ready" | "blocked" | "verification_gap";
            blockingCodes: string[];
          }>;
        };
      };
      const connectorDomain = payload.data.domainAssessments.find((item) => item.id === "provider_deep_connectors");
      expect(connectorDomain).toBeDefined();
      expect(connectorDomain?.status).toBe("verification_gap");
      expect(
        connectorDomain?.blockingCodes.some((code) => code.startsWith("connector_sync_proof_missing_"))
      ).toBe(true);
      const apiMcpDomain = payload.data.domainAssessments.find((item) => item.id === "api_mcp_ga");
      expect(apiMcpDomain).toBeDefined();
      expect(apiMcpDomain?.status).toBe("verification_gap");
      expect(apiMcpDomain?.blockingCodes).toContain("mcp_lifecycle_evidence_missing");
      expect(payload.data.readinessBoard.goNoGo).toBe("go");
      expect(payload.data.decision).toBe("no_go");
    } finally {
      for (const key of envKeys) {
        const value = previousValues[key];
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });

  it("marks provider-deep connectors as ready when connected providers have successful sync evidence", async () => {
    const orgId = await createOrg();
    const repository = getRepository();

    const envKeys = [
      "OPENAI_API_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "SLACK_CLIENT_ID",
      "SLACK_CLIENT_SECRET",
      "MICROSOFT_CLIENT_ID",
      "MICROSOFT_CLIENT_SECRET",
      "HUBSPOT_CLIENT_ID",
      "HUBSPOT_CLIENT_SECRET",
      "SALESFORCE_CLIENT_ID",
      "SALESFORCE_CLIENT_SECRET",
      "INTERCOM_CLIENT_ID",
      "INTERCOM_CLIENT_SECRET",
      "ZENDESK_CLIENT_ID",
      "ZENDESK_CLIENT_SECRET",
      "ZENDESK_AUTHORIZE_URL",
      "ZENDESK_TOKEN_URL",
      "ZENDESK_API_BASE_URL",
      "OPERATORLAYER_SCIM_TOKEN",
      "OPERATORLAYER_OAUTH_STATE_SECRET",
    ] as const;
    const previousValues = Object.fromEntries(envKeys.map((key) => [key, process.env[key]])) as Record<
      (typeof envKeys)[number],
      string | undefined
    >;

    try {
      process.env.OPENAI_API_KEY = "release-decision-test-openai";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://release-decision-test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "release-decision-test-anon";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "release-decision-test-service-role";
      process.env.GOOGLE_CLIENT_ID = "release-decision-test-google-id";
      process.env.GOOGLE_CLIENT_SECRET = "release-decision-test-google-secret";
      process.env.SLACK_CLIENT_ID = "release-decision-test-slack-id";
      process.env.SLACK_CLIENT_SECRET = "release-decision-test-slack-secret";
      process.env.MICROSOFT_CLIENT_ID = "release-decision-test-ms-id";
      process.env.MICROSOFT_CLIENT_SECRET = "release-decision-test-ms-secret";
      process.env.HUBSPOT_CLIENT_ID = "release-decision-test-hubspot-id";
      process.env.HUBSPOT_CLIENT_SECRET = "release-decision-test-hubspot-secret";
      process.env.SALESFORCE_CLIENT_ID = "release-decision-test-salesforce-id";
      process.env.SALESFORCE_CLIENT_SECRET = "release-decision-test-salesforce-secret";
      process.env.INTERCOM_CLIENT_ID = "release-decision-test-intercom-id";
      process.env.INTERCOM_CLIENT_SECRET = "release-decision-test-intercom-secret";
      process.env.ZENDESK_CLIENT_ID = "release-decision-test-zendesk-id";
      process.env.ZENDESK_CLIENT_SECRET = "release-decision-test-zendesk-secret";
      process.env.ZENDESK_AUTHORIZE_URL = "https://release-decision-test.zendesk.com/oauth/authorizations/new";
      process.env.ZENDESK_TOKEN_URL = "https://release-decision-test.zendesk.com/oauth/tokens";
      process.env.ZENDESK_API_BASE_URL = "https://release-decision-test.zendesk.com/api/v2";
      process.env.OPERATORLAYER_SCIM_TOKEN = "release-decision-test-scim-token";
      process.env.OPERATORLAYER_OAUTH_STATE_SECRET = "release-decision-test-oauth-state-secret";

      const connectorProviders = [
        "gmail",
        "slack",
        "outlook",
        "hubspot",
        "salesforce",
        "intercom",
        "zendesk",
      ] as const;

      for (const key of [
        "auto_send",
        "scim_write",
        "connector_gmail",
        "connector_slack",
        "connector_outlook",
        "connector_hubspot",
        "connector_salesforce",
        "connector_intercom",
        "connector_zendesk",
        "mcp_actions",
      ] as const) {
        await repository.createIngestionLog({
          organisationId: orgId,
          sourceId: null,
          action: "enterprise:feature_flag_upsert",
          details: {
            key,
            enabled: true,
            rolloutPercent: 100,
            updatedBy: "test-user-001",
          },
        });
      }

      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: null,
        action: "enterprise:billing_entitlement_upsert",
        details: {
          organisationId: orgId,
          plan: "enterprise",
          seatsLimit: 100,
          evaluationsMonthlyLimit: 10000,
          sourcesMonthlyLimit: 1000,
          connectorLimit: 20,
          autoSendEnabled: true,
          apiAccessEnabled: true,
          mcpAccessEnabled: true,
          status: "active",
          updatedAt: new Date().toISOString(),
        },
      });
      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: null,
        action: "enterprise:sso_config_upsert",
        details: {
          enabled: true,
          idpEntityId: "https://idp.example.com/entity",
          ssoUrl: "https://idp.example.com/saml",
          certificateFingerprint: "AA:BB:CC:DD:EE:FF:11:22",
          metadataSource: "manual",
          updatedAt: new Date().toISOString(),
        },
      });

      for (const provider of connectorProviders) {
        await repository.createIngestionLog({
          organisationId: orgId,
          sourceId: null,
          action: "enterprise:connector_upsert",
          details: {
            provider,
            status: "connected",
            displayName: provider.toUpperCase(),
            scopes: ["read"],
            sourceSelection: ["all"],
            syncSchedule: "hourly",
            actorId: "test-user-001",
          },
        });
      }

      for (const provider of connectorProviders) {
        await repository.createIngestionLog({
          organisationId: orgId,
          sourceId: null,
          action: "enterprise:connector_sync_result",
          details: {
            provider,
            syncStatus: "succeeded",
            actorId: "test-user-001",
          },
        });
      }
      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: null,
        action: "enterprise:mcp_capability_evaluated",
        details: {
          capabilityId: "mcp_actions",
          actorId: "test-user-001",
        },
      });
      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: "source-reliability-ready-001",
        action: "source_uploaded",
        details: {
          sourceType: "pasted_text",
          title: "Reliability Ready Source",
          authorityLevel: "standard",
        },
      });
      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: "source-reliability-ready-001",
        action: "source_process_requested",
        details: {
          sourceId: "source-reliability-ready-001",
          mode: "manual",
        },
      });

      const response = await getReleaseDecision(authedRequest("http://localhost/api/enterprise/release-decision", orgId));
      expect(response.status).toBe(200);
      const payload = (await response.json()) as {
        data: {
          decision: "go" | "no_go";
          nextActions: string[];
          readinessBoard: { goNoGo: "go" | "no_go" };
          onboardingChecklist: { readinessMeter: { completionPct: number } };
          domainAssessments: Array<{
            id: string;
            status: "ready" | "blocked" | "verification_gap";
            blockingCodes: string[];
          }>;
          closureAudit: {
            requirements: Array<{
              id: string;
              status: "proved" | "blocked" | "incomplete";
              gaps: string[];
            }>;
          };
        };
      };

      const connectorDomain = payload.data.domainAssessments.find((item) => item.id === "provider_deep_connectors");
      expect(connectorDomain).toBeDefined();
      expect(connectorDomain?.status).toBe("ready");
      expect(
        connectorDomain?.blockingCodes.some((code) => code.startsWith("connector_sync_proof_missing_"))
      ).toBe(false);

      const connectorClosureRequirement = payload.data.closureAudit.requirements.find(
        (item) => item.id === "provider_deep_connectors"
      );
      expect(connectorClosureRequirement).toBeDefined();
      expect(connectorClosureRequirement?.status).toBe("proved");
      expect(connectorClosureRequirement?.gaps).toHaveLength(0);

      const reliabilityDomain = payload.data.domainAssessments.find(
        (item) => item.id === "reliability_control_plane"
      );
      expect(reliabilityDomain).toBeDefined();
      expect(reliabilityDomain?.status).toBe("ready");
      expect(reliabilityDomain?.blockingCodes).toHaveLength(0);

      const billingDomain = payload.data.domainAssessments.find((item) => item.id === "billing_entitlements");
      expect(billingDomain).toBeDefined();
      expect(billingDomain?.status).toBe("ready");
      expect(billingDomain?.blockingCodes).toHaveLength(0);

      const apiMcpDomain = payload.data.domainAssessments.find((item) => item.id === "api_mcp_ga");
      expect(apiMcpDomain).toBeDefined();
      expect(apiMcpDomain?.status).toBe("ready");
      expect(apiMcpDomain?.blockingCodes).toHaveLength(0);

      const enterpriseUxDomain = payload.data.domainAssessments.find((item) => item.id === "enterprise_ux");
      expect(enterpriseUxDomain).toBeDefined();
      expect(enterpriseUxDomain?.status).toBe("ready");
      expect(enterpriseUxDomain?.blockingCodes).toHaveLength(0);

      const operationalReadinessDomain = payload.data.domainAssessments.find(
        (item) => item.id === "operational_readiness"
      );
      expect(operationalReadinessDomain).toBeDefined();
      expect(operationalReadinessDomain?.status).toBe("ready");
      expect(operationalReadinessDomain?.blockingCodes).toHaveLength(0);

      const enterpriseUxRequirement = payload.data.closureAudit.requirements.find(
        (item) => item.id === "enterprise_ux"
      );
      const reliabilityRequirement = payload.data.closureAudit.requirements.find(
        (item) => item.id === "reliability_control_plane"
      );
      expect(reliabilityRequirement).toBeDefined();
      expect(reliabilityRequirement?.status).toBe("proved");

      const billingRequirement = payload.data.closureAudit.requirements.find(
        (item) => item.id === "billing_entitlements"
      );
      expect(billingRequirement).toBeDefined();
      expect(billingRequirement?.status).toBe("proved");

      const apiMcpRequirement = payload.data.closureAudit.requirements.find(
        (item) => item.id === "api_mcp_ga"
      );
      expect(apiMcpRequirement).toBeDefined();
      expect(apiMcpRequirement?.status).toBe("proved");

      expect(enterpriseUxRequirement).toBeDefined();
      expect(enterpriseUxRequirement?.status).toBe("proved");

      const operationalReadinessRequirement = payload.data.closureAudit.requirements.find(
        (item) => item.id === "operational_readiness"
      );
      expect(operationalReadinessRequirement).toBeDefined();
      expect(operationalReadinessRequirement?.status).toBe("proved");

      expect(payload.data.readinessBoard.goNoGo).toBe("go");
      expect(payload.data.onboardingChecklist.readinessMeter.completionPct).toBe(100);
    } finally {
      for (const key of envKeys) {
        const value = previousValues[key];
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });

  it("marks IAM as verification_gap when SSO/SCIM/RBAC lifecycle evidence is missing", async () => {
    const orgId = await createOrg();
    const repository = getRepository();

    const previousScimToken = process.env.OPERATORLAYER_SCIM_TOKEN;
    try {
      process.env.OPERATORLAYER_SCIM_TOKEN = "release-decision-test-scim-token";

      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: null,
        action: "enterprise:feature_flag_upsert",
        details: {
          key: "scim_write",
          enabled: true,
          rolloutPercent: 100,
          updatedBy: "test-user-001",
        },
      });
      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: null,
        action: "enterprise:sso_config_upsert",
        details: {
          enabled: true,
          idpEntityId: "https://idp.example.com/entity",
          ssoUrl: "https://idp.example.com/saml",
          certificateFingerprint: "AA:BB:CC:DD:EE:FF:11:22",
          metadataSource: "manual",
          updatedAt: new Date().toISOString(),
        },
      });

      const response = await getReleaseDecision(authedRequest("http://localhost/api/enterprise/release-decision", orgId));
      expect(response.status).toBe(200);
      const payload = (await response.json()) as {
        data: {
          domainAssessments: Array<{
            id: string;
            status: "ready" | "blocked" | "verification_gap";
            blockingCodes: string[];
          }>;
        };
      };

      const iamDomain = payload.data.domainAssessments.find((item) => item.id === "iam_saml_scim_rbac_audit");
      expect(iamDomain).toBeDefined();
      expect(iamDomain?.status).toBe("verification_gap");
      expect(iamDomain?.blockingCodes).toContain("iam_security_audit_evidence_missing");
      expect(iamDomain?.blockingCodes).not.toContain("sso_config_lifecycle_evidence_missing");
      expect(iamDomain?.blockingCodes).toContain("scim_bulk_operation_lifecycle_evidence_missing");
      expect(iamDomain?.blockingCodes).toContain("scim_user_status_lifecycle_evidence_missing");
      expect(iamDomain?.blockingCodes).toContain("scim_drift_reconcile_lifecycle_evidence_missing");
      expect(iamDomain?.blockingCodes).toContain("rbac_role_change_lifecycle_evidence_missing");
      expect(iamDomain?.blockingCodes).toContain("member_invite_lifecycle_evidence_missing");
    } finally {
      if (previousScimToken === undefined) {
        delete process.env.OPERATORLAYER_SCIM_TOKEN;
      } else {
        process.env.OPERATORLAYER_SCIM_TOKEN = previousScimToken;
      }
    }
  });

  it("marks intelligence hardening as ready when evaluation, review, policy, and scenario signals are present", async () => {
    const orgId = await createOrg();
    const repository = getRepository();
    const now = new Date().toISOString();

    const source = await repository.createSource({
      organisationId: orgId,
      title: "Intelligence Evidence Source",
      sourceType: "pasted_text",
      authorityLevel: "standard",
      rawText: "Use approved terminology and follow enterprise escalation flow.",
      metadata: {},
    });

    await repository.replaceExtractedData({
      source,
      chunks: [],
      policies: [
        {
          id: "policy-intelligence-001",
          organisationId: orgId,
          name: "Escalation flow policy",
          ruleType: "escalation",
          description: "Escalate legal and pricing exceptions to review queue.",
          severity: "high",
          status: "approved",
          structuredRule: {
            scenario: "enterprise_exception",
            requiredBehaviour: "Escalate exceptions before sending",
          },
          sourceEvidence: [{ sourceId: source.id, chunkIndex: 0 }],
          confidence: 0.96,
          createdAt: now,
          updatedAt: now,
          reviewedBy: "test-user-001",
          reviewedAt: now,
        },
      ],
      terminologyPatterns: [],
      scenarios: [
        {
          id: "scenario-intelligence-001",
          organisationId: orgId,
          name: "Enterprise exception handling",
          category: "customer_response",
          description: "Guide exception handling with explicit approval boundaries.",
          riskLevel: "high",
          triggerPhrases: ["exception", "legal terms"],
          approvedResponseFlow: ["acknowledge", "escalate", "await approval"],
          forbiddenBehaviours: ["promise immediate approval"],
          evaluationRubric: {
            policyCompliance: 30,
            scenarioFlow: 25,
            approvedTerminology: 15,
            forbiddenPhraseAvoidance: 15,
            toneMatch: 10,
            clarityNextStep: 5,
          },
          createdAt: now,
        },
      ],
      conflicts: [],
    });

    await repository.createEvaluation(orgId, {
      scenarioId: "scenario-intelligence-001",
      inputMessage: "Customer requests non-standard legal terms and discount.",
      originalDraft: "We can approve this right away.",
      repairedDraft: "We need legal review before approving this request.",
      detectedPhrases: ["legal review"],
      missingRequiredElements: [],
      policyViolations: [],
      scores: {
        total: 95,
        policyCompliance: 95,
        scenarioFlow: 94,
        approvedTerminology: 96,
        forbiddenPhraseAvoidance: 95,
        toneMatch: 94,
        clarityNextStep: 96,
      },
      approvalRequired: false,
      repairRequired: false,
    });

    await repository.createReviewEvent({
      organisationId: orgId,
      itemType: "policy",
      itemId: "policy-intelligence-001",
      action: "approve",
      actorId: "test-user-001",
      beforeState: { status: "suggested" },
      afterState: { status: "approved" },
    });

    const response = await getReleaseDecision(authedRequest("http://localhost/api/enterprise/release-decision", orgId));
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      data: {
        domainAssessments: Array<{
          id: string;
          status: "ready" | "blocked" | "verification_gap";
          blockingCodes: string[];
        }>;
        closureAudit: {
          requirements: Array<{
            id: string;
            status: "proved" | "blocked" | "incomplete";
            gaps: string[];
          }>;
        };
      };
    };

    const intelligenceDomain = payload.data.domainAssessments.find((item) => item.id === "intelligence_hardening");
    expect(intelligenceDomain).toBeDefined();
    expect(intelligenceDomain?.status).toBe("ready");
    expect(intelligenceDomain?.blockingCodes).toHaveLength(0);

    const intelligenceRequirement = payload.data.closureAudit.requirements.find(
      (item) => item.id === "intelligence_hardening"
    );
    expect(intelligenceRequirement).toBeDefined();
    expect(intelligenceRequirement?.status).toBe("proved");
    expect(intelligenceRequirement?.gaps).toHaveLength(0);
  });

  it("marks approval auto-send governance as ready when capability and delivery evidence are present", async () => {
    const orgId = await createOrg();
    const repository = getRepository();
    const now = new Date().toISOString();

    const envKeys = [
      "OPENAI_API_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ] as const;
    const previousValues = Object.fromEntries(envKeys.map((key) => [key, process.env[key]])) as Record<
      (typeof envKeys)[number],
      string | undefined
    >;

    try {
      process.env.OPENAI_API_KEY = "release-decision-test-openai";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://release-decision-test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "release-decision-test-anon";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "release-decision-test-service-role";

      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: null,
        action: "enterprise:feature_flag_upsert",
        details: {
          key: "auto_send",
          enabled: true,
          rolloutPercent: 100,
          updatedBy: "test-user-001",
        },
      });

      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: null,
        action: "enterprise:billing_entitlement_upsert",
        details: {
          organisationId: orgId,
          plan: "enterprise",
          seatsLimit: 100,
          evaluationsMonthlyLimit: 10000,
          sourcesMonthlyLimit: 1000,
          connectorLimit: 20,
          autoSendEnabled: true,
          apiAccessEnabled: true,
          mcpAccessEnabled: true,
          status: "active",
          updatedAt: now,
        },
      });

      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: null,
        action: "enterprise:approval_rule_upsert",
        details: {
          id: "rule-auto-send-001",
          name: "Auto-send low-risk boundary",
          channel: "email",
          enabled: true,
          maxRiskLevel: "low",
          minScore: 90,
          updatedBy: "test-user-001",
        },
      });

      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: null,
        action: "enterprise:auto_send_decision_recorded",
        details: {
          requestKey: "auto-send-ready-001",
          decision: {
            allowed: true,
            state: "allowed",
            reason: "Matched low-risk auto-send rule.",
            matchedRuleId: "rule-auto-send-001",
            approvalRequired: false,
            approvalDecision: {
              status: "approved",
              reason: "Policy threshold met",
              matchedRuleId: "rule-auto-send-001",
              approvalRequired: false,
            },
          },
          actorId: "test-user-001",
        },
      });
      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: null,
        action: "enterprise:send_event_created",
        details: {
          id: "send-event-ready-001",
          evaluationId: "eval-ready-001",
          scenarioId: "scenario-ready-001",
          workspaceId: "workspace-ready-001",
          channel: "email",
          recipient: "customer@example.com",
          draft: "Approved response with next steps.",
          status: "queued",
          reason: "Auto-send permitted",
          evidence: ["auto_send_policy_matched"],
          autoSend: true,
          createdBy: "test-user-001",
          createdAt: now,
          updatedAt: now,
          actorId: "test-user-001",
        },
      });
      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: null,
        action: "enterprise:send_event_delivery_confirmed",
        details: {
          id: "send-event-ready-001",
          confirmationSource: "auto_send_worker",
          confirmationId: "delivery-ready-001",
          reason: "Delivery confirmed by worker.",
          actorId: "test-user-001",
        },
      });

      const response = await getReleaseDecision(authedRequest("http://localhost/api/enterprise/release-decision", orgId));
      expect(response.status).toBe(200);
      const payload = (await response.json()) as {
        data: {
          domainAssessments: Array<{
            id: string;
            status: "ready" | "blocked" | "verification_gap";
            blockingCodes: string[];
          }>;
          closureAudit: {
            requirements: Array<{
              id: string;
              status: "proved" | "blocked" | "incomplete";
              gaps: string[];
            }>;
          };
        };
      };

      const autoSendDomain = payload.data.domainAssessments.find(
        (item) => item.id === "approval_auto_send_governance"
      );
      expect(autoSendDomain).toBeDefined();
      expect(autoSendDomain?.status).toBe("ready");
      expect(autoSendDomain?.blockingCodes).toHaveLength(0);

      const autoSendRequirement = payload.data.closureAudit.requirements.find(
        (item) => item.id === "approval_auto_send_governance"
      );
      expect(autoSendRequirement).toBeDefined();
      expect(autoSendRequirement?.status).toBe("proved");
      expect(autoSendRequirement?.gaps).toHaveLength(0);
    } finally {
      for (const key of envKeys) {
        const value = previousValues[key];
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });

  it("marks IAM as ready when SSO, SCIM, and RBAC lifecycle evidence is present", async () => {
    const orgId = await createOrg();
    const repository = getRepository();

    const previousScimToken = process.env.OPERATORLAYER_SCIM_TOKEN;
    try {
      process.env.OPERATORLAYER_SCIM_TOKEN = "release-decision-test-scim-token";

      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: null,
        action: "enterprise:feature_flag_upsert",
        details: {
          key: "scim_write",
          enabled: true,
          rolloutPercent: 100,
          updatedBy: "test-user-001",
        },
      });
      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: null,
        action: "enterprise:sso_config_upsert",
        details: {
          enabled: true,
          idpEntityId: "https://idp.example.com/entity",
          ssoUrl: "https://idp.example.com/saml",
          certificateFingerprint: "AA:BB:CC:DD:EE:FF:11:22",
          metadataSource: "manual",
          updatedAt: new Date().toISOString(),
        },
      });
      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: null,
        action: "enterprise:scim_bulk_operation",
        details: {
          operationId: "op-iam-ready-001",
          method: "PATCH",
          path: "/Users/iam-ready-user",
          statusCode: 200,
          actorId: "test-user-001",
        },
      });
      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: null,
        action: "enterprise:scim_user_status_set",
        details: {
          userId: "iam-ready-user",
          active: false,
          actorId: "test-user-001",
          reason: "deprovision",
        },
      });
      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: null,
        action: "enterprise:scim_drift_reconcile_run",
        details: {
          mode: "apply",
          actorId: "test-user-001",
          issueCount: 1,
          resolvedCount: 1,
        },
      });
      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: null,
        action: "enterprise:member_role_updated",
        details: {
          memberId: "iam-ready-user",
          previousRole: "member",
          newRole: "admin",
          actorId: "test-user-001",
        },
      });
      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: null,
        action: "enterprise:member_invite_created",
        details: {
          inviteId: "invite-iam-ready-001",
          email: "iam-ready@example.com",
          role: "reviewer",
          actorId: "test-user-001",
        },
      });
      await repository.createIngestionLog({
        organisationId: orgId,
        sourceId: null,
        action: "enterprise:api_key_created",
        details: {
          id: "api-key-iam-ready-001",
          actorId: "test-user-001",
        },
      });

      const response = await getReleaseDecision(authedRequest("http://localhost/api/enterprise/release-decision", orgId));
      expect(response.status).toBe(200);
      const payload = (await response.json()) as {
        data: {
          domainAssessments: Array<{
            id: string;
            status: "ready" | "blocked" | "verification_gap";
            blockingCodes: string[];
          }>;
        };
      };

      const iamDomain = payload.data.domainAssessments.find((item) => item.id === "iam_saml_scim_rbac_audit");
      expect(iamDomain).toBeDefined();
      expect(iamDomain?.status).toBe("ready");
      expect(iamDomain?.blockingCodes).toHaveLength(0);
    } finally {
      if (previousScimToken === undefined) {
        delete process.env.OPERATORLAYER_SCIM_TOKEN;
      } else {
        process.env.OPERATORLAYER_SCIM_TOKEN = previousScimToken;
      }
    }
  });
});
