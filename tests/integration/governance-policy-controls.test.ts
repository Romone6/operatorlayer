import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createOrganisation } from "@/app/api/organisations/route";
import { GET as getGovernancePolicy, PATCH as patchGovernancePolicy } from "@/app/api/data-governance/policies/route";
import { POST as simulateGovernancePolicy } from "@/app/api/data-governance/policies/simulate/route";
import { GET as getAuditEvents } from "@/app/api/audit/events/route";
import { POST as createDeletionRequest } from "@/app/api/data-governance/deletion-requests/route";
import { getRepository } from "@/lib/repository";
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
    body: JSON.stringify({ name: "Governance Policy Org", industry: "SaaS" }),
  });
  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("governance policy controls", () => {
  beforeEach(() => {
    resetMemoryRepository();
  });

  it("returns defaults and persists enterprise governance controls", async () => {
    const orgId = await createOrg();

    const forbiddenRead = await getGovernancePolicy(
      authedRequest("http://localhost/api/data-governance/policies", orgId, {}, "member")
    );
    expect(forbiddenRead.status).toBe(403);

    const initial = await getGovernancePolicy(
      authedRequest("http://localhost/api/data-governance/policies", orgId)
    );
    expect(initial.status).toBe(200);
    const initialPayload = (await initial.json()) as {
      data: {
        invitePolicy: string;
        sessionDurationMinutes: number;
        enforcedMfa: boolean;
        breakGlassAdminEnabled: boolean;
      };
    };
    expect(initialPayload.data.invitePolicy).toBe("open");
    expect(initialPayload.data.sessionDurationMinutes).toBe(480);
    expect(initialPayload.data.enforcedMfa).toBe(false);
    expect(initialPayload.data.breakGlassAdminEnabled).toBe(true);

    const patched = await patchGovernancePolicy(
      authedRequest("http://localhost/api/data-governance/policies", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retentionDays: 720,
          legalHoldEnabled: false,
          deletionRequiresApproval: true,
          invitePolicy: "domain_allowlist_only",
          sessionDurationMinutes: 240,
          enforcedMfa: true,
          breakGlassAdminEnabled: true,
        }),
      })
    );
    expect(patched.status).toBe(200);
    const patchedPayload = (await patched.json()) as {
      data: {
        invitePolicy: string;
        sessionDurationMinutes: number;
        enforcedMfa: boolean;
        breakGlassAdminEnabled: boolean;
      };
    };
    expect(patchedPayload.data.invitePolicy).toBe("domain_allowlist_only");
    expect(patchedPayload.data.sessionDurationMinutes).toBe(240);
    expect(patchedPayload.data.enforcedMfa).toBe(true);
    expect(patchedPayload.data.breakGlassAdminEnabled).toBe(true);

    const audit = await getAuditEvents(
      authedRequest("http://localhost/api/audit/events?limit=50&category=governance", orgId)
    );
    expect(audit.status).toBe(200);
    const auditPayload = (await audit.json()) as {
      data: { events: Array<{ action: string }> };
    };
    expect(
      auditPayload.data.events.some((event) => event.action === "enterprise:governance_policy_upsert")
    ).toBe(true);
  });

  it("simulates retention/legal-hold policy impact before apply", async () => {
    const orgId = await createOrg();
    const repository = getRepository();
    await repository.createSource({
      organisationId: orgId,
      title: "Simulation Source",
      sourceType: "pdf",
      rawText: "Sample source for retention simulation.",
    });

    const deletionResponse = await createDeletionRequest(
      authedRequest("http://localhost/api/data-governance/deletion-requests", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Retention policy simulation pending request",
          target: "sources_only",
        }),
      })
    );
    expect(deletionResponse.status).toBe(201);

    const simulateResponse = await simulateGovernancePolicy(
      authedRequest("http://localhost/api/data-governance/policies/simulate", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposedPolicy: {
            retentionDays: 30,
            legalHoldEnabled: true,
            deletionRequiresApproval: false,
            invitePolicy: "open",
            sessionDurationMinutes: 1440,
            enforcedMfa: false,
            breakGlassAdminEnabled: true,
          },
        }),
      })
    );
    expect(simulateResponse.status).toBe(200);
    const simulatePayload = (await simulateResponse.json()) as {
      data: {
        status: "safe" | "review_required" | "blocked";
        warnings: Array<{ code: string }>;
        blockedActions: Array<{ code: string }>;
      };
    };
    expect(simulatePayload.data.status).toBe("blocked");
    expect(simulatePayload.data.warnings.some((item) => item.code === "retention_reduction_requires_review")).toBe(
      true
    );
    expect(simulatePayload.data.warnings.some((item) => item.code === "deletion_without_approval_risk")).toBe(true);
    expect(simulatePayload.data.warnings.some((item) => item.code === "long_sessions_without_mfa")).toBe(true);
    expect(
      simulatePayload.data.blockedActions.some((item) => item.code === "deletion_requests_blocked_by_legal_hold")
    ).toBe(true);

    const auditResponse = await getAuditEvents(
      authedRequest("http://localhost/api/audit/events?limit=50&category=governance", orgId)
    );
    expect(auditResponse.status).toBe(200);
    const auditPayload = (await auditResponse.json()) as {
      data: { events: Array<{ action: string }> };
    };
    expect(
      auditPayload.data.events.some((event) => event.action === "enterprise:governance_policy_simulated")
    ).toBe(true);
  });
});
