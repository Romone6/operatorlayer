import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { GET as getAuditEvents } from "@/app/api/audit/events/route";
import {
  GET as getBreakGlassState,
  PATCH as releaseBreakGlass,
  POST as invokeBreakGlass,
} from "@/app/api/data-governance/break-glass/route";
import { PATCH as patchGovernancePolicy } from "@/app/api/data-governance/policies/route";
import { POST as createOrganisation } from "@/app/api/organisations/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

function authedRequest(
  url: string,
  orgId: string,
  init: RequestInit = {},
  role = "owner",
  capabilities?: string
) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "test-user-break-glass-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", role);
  headers.set("x-user-email", "owner@example.com");
  if (capabilities) headers.set("x-user-capabilities", capabilities);
  return new NextRequest(url, { ...init, headers });
}

async function createOrg() {
  const request = new NextRequest("http://localhost/api/organisations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": "test-user-break-glass-001",
    },
    body: JSON.stringify({ name: "Break Glass Org", industry: "SaaS" }),
  });
  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("break-glass governance protocol", () => {
  beforeEach(() => {
    resetMemoryRepository();
  });

  it("supports invoke and release lifecycle with governance audit entries", async () => {
    const orgId = await createOrg();

    const invokeResponse = await invokeBreakGlass(
      authedRequest("http://localhost/api/data-governance/break-glass", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Emergency change window for incident mitigation.",
          ticketRef: "INC-4421",
          durationMinutes: 30,
        }),
      })
    );
    expect(invokeResponse.status).toBe(201);
    const invokePayload = (await invokeResponse.json()) as {
      data: {
        active: { invocationId: string; reason: string; ticketRef: string | null; status: string };
        history: Array<{ status: string }>;
      };
    };
    expect(invokePayload.data.active.status).toBe("active");
    expect(invokePayload.data.active.reason).toContain("incident mitigation");
    expect(invokePayload.data.active.ticketRef).toBe("INC-4421");
    expect(invokePayload.data.history[0]?.status).toBe("active");

    const duplicateInvoke = await invokeBreakGlass(
      authedRequest("http://localhost/api/data-governance/break-glass", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Second emergency request while already active.",
          durationMinutes: 15,
        }),
      })
    );
    expect(duplicateInvoke.status).toBe(409);
    const duplicatePayload = (await duplicateInvoke.json()) as { error: { code: string } };
    expect(duplicatePayload.error.code).toBe("break_glass_already_active");

    const releaseResponse = await releaseBreakGlass(
      authedRequest("http://localhost/api/data-governance/break-glass", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Incident stabilized and emergency privileges revoked.",
        }),
      })
    );
    expect(releaseResponse.status).toBe(200);
    const releasePayload = (await releaseResponse.json()) as {
      data: {
        active: null;
        history: Array<{ status: string; releaseReason: string | null }>;
      };
    };
    expect(releasePayload.data.active).toBeNull();
    expect(releasePayload.data.history[0]?.status).toBe("released");
    expect(releasePayload.data.history[0]?.releaseReason).toContain("Incident stabilized");

    const stateResponse = await getBreakGlassState(
      authedRequest("http://localhost/api/data-governance/break-glass", orgId)
    );
    expect(stateResponse.status).toBe(200);
    const statePayload = (await stateResponse.json()) as {
      data: { active: null; history: Array<{ status: string }> };
    };
    expect(statePayload.data.active).toBeNull();
    expect(statePayload.data.history[0]?.status).toBe("released");

    const auditResponse = await getAuditEvents(
      authedRequest("http://localhost/api/audit/events?limit=50&category=governance", orgId)
    );
    expect(auditResponse.status).toBe(200);
    const auditPayload = (await auditResponse.json()) as {
      data: { events: Array<{ action: string; severity: string; category: string }> };
    };
    expect(
      auditPayload.data.events.some(
        (item) =>
          item.action === "enterprise:break_glass_invoked" &&
          item.severity === "critical" &&
          item.category === "governance"
      )
    ).toBe(true);
    expect(
      auditPayload.data.events.some(
        (item) => item.action === "enterprise:break_glass_released" && item.category === "governance"
      )
    ).toBe(true);
  });

  it("fails closed when break-glass is disabled by governance policy", async () => {
    const orgId = await createOrg();

    const policyResponse = await patchGovernancePolicy(
      authedRequest("http://localhost/api/data-governance/policies", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retentionDays: 365,
          legalHoldEnabled: false,
          deletionRequiresApproval: true,
          invitePolicy: "open",
          sessionDurationMinutes: 480,
          enforcedMfa: true,
          breakGlassAdminEnabled: false,
        }),
      })
    );
    expect(policyResponse.status).toBe(200);

    const invokeResponse = await invokeBreakGlass(
      authedRequest("http://localhost/api/data-governance/break-glass", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Attempt emergency protocol while policy disabled.",
          durationMinutes: 30,
        }),
      })
    );
    expect(invokeResponse.status).toBe(409);
    const payload = (await invokeResponse.json()) as { error: { code: string } };
    expect(payload.error.code).toBe("break_glass_disabled");
  });

  it("requires compliance-admin capability", async () => {
    const orgId = await createOrg();

    const invokeResponse = await invokeBreakGlass(
      authedRequest(
        "http://localhost/api/data-governance/break-glass",
        orgId,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: "Admin user without compliance capability.",
            durationMinutes: 30,
          }),
        },
        "admin",
        "connector-admin"
      )
    );
    expect(invokeResponse.status).toBe(403);
    const payload = (await invokeResponse.json()) as { error: { code: string } };
    expect(payload.error.code).toBe("capability_forbidden");
  });
});
