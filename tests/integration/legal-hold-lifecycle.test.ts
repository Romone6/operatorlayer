import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { GET as getAuditEvents } from "@/app/api/audit/events/route";
import { POST as createDeletionRequest } from "@/app/api/data-governance/deletion-requests/route";
import {
  GET as getLegalHoldState,
  PATCH as patchLegalHold,
  POST as postLegalHold,
} from "@/app/api/data-governance/legal-hold/route";
import { POST as createOrganisation } from "@/app/api/organisations/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

function authedRequest(url: string, orgId: string, init: RequestInit = {}, role = "owner") {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "test-user-legal-hold-001");
  headers.set("x-user-email", "owner@example.com");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", role);
  return new NextRequest(url, { ...init, headers });
}

async function createOrg() {
  const request = new NextRequest("http://localhost/api/organisations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": "test-user-legal-hold-001",
    },
    body: JSON.stringify({ name: "Legal Hold Org", industry: "SaaS" }),
  });
  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("legal hold lifecycle", () => {
  beforeEach(() => {
    resetMemoryRepository();
  });

  it("supports place/release lifecycle with governance audit and deletion blocking", async () => {
    const orgId = await createOrg();

    const placeResponse = await postLegalHold(
      authedRequest("http://localhost/api/data-governance/legal-hold", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "global",
          reason: "Legal review in progress for potential litigation hold.",
          ticketRef: "LEGAL-1001",
          durationHours: 24,
        }),
      })
    );
    expect(placeResponse.status).toBe(201);
    const placePayload = (await placeResponse.json()) as {
      data: { active: { holdId: string; scope: string; status: string } | null };
    };
    expect(placePayload.data.active?.status).toBe("active");
    expect(placePayload.data.active?.scope).toBe("global");
    const holdId = placePayload.data.active?.holdId;
    expect(holdId).toBeTruthy();

    const blockedDeletion = await createDeletionRequest(
      authedRequest("http://localhost/api/data-governance/deletion-requests", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Deletion should be blocked while legal hold active.",
          target: "sources_only",
        }),
      })
    );
    expect(blockedDeletion.status).toBe(409);
    const blockedPayload = (await blockedDeletion.json()) as { error: { code: string } };
    expect(blockedPayload.error.code).toBe("legal_hold_active");

    const releaseResponse = await patchLegalHold(
      authedRequest("http://localhost/api/data-governance/legal-hold", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "release",
          holdId,
          reason: "Counsel approved release after case closure.",
          ticketRef: "LEGAL-1002",
        }),
      })
    );
    expect(releaseResponse.status).toBe(200);
    const releasePayload = (await releaseResponse.json()) as {
      data: { active: null; history: Array<{ status: string }> };
    };
    expect(releasePayload.data.active).toBeNull();
    expect(releasePayload.data.history[0]?.status).toBe("released");

    const stateResponse = await getLegalHoldState(
      authedRequest("http://localhost/api/data-governance/legal-hold", orgId)
    );
    expect(stateResponse.status).toBe(200);
    const statePayload = (await stateResponse.json()) as {
      data: { active: null; history: Array<{ status: string; holdId: string }> };
    };
    expect(statePayload.data.active).toBeNull();
    expect(statePayload.data.history.some((entry) => entry.holdId === holdId)).toBe(true);

    const allowedDeletion = await createDeletionRequest(
      authedRequest("http://localhost/api/data-governance/deletion-requests", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Deletion should be allowed after legal hold release.",
          target: "sources_only",
        }),
      })
    );
    expect(allowedDeletion.status).toBe(201);

    const auditResponse = await getAuditEvents(
      authedRequest("http://localhost/api/audit/events?limit=100&category=governance", orgId)
    );
    expect(auditResponse.status).toBe(200);
    const auditPayload = (await auditResponse.json()) as {
      data: { events: Array<{ action: string; severity: string }> };
    };
    expect(
      auditPayload.data.events.some(
        (item) => item.action === "enterprise:legal_hold_placed" && item.severity === "critical"
      )
    ).toBe(true);
    expect(auditPayload.data.events.some((item) => item.action === "enterprise:legal_hold_released")).toBe(true);
  });

  it("supports override lifecycle and capability guardrails", async () => {
    const orgId = await createOrg();

    const placeResponse = await postLegalHold(
      authedRequest("http://localhost/api/data-governance/legal-hold", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "evaluations",
          reason: "Evaluation records on temporary hold for external audit.",
          ticketRef: "LEGAL-2001",
        }),
      })
    );
    expect(placeResponse.status).toBe(201);

    const duplicatePlace = await postLegalHold(
      authedRequest("http://localhost/api/data-governance/legal-hold", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "sources",
          reason: "Second hold while first active should fail.",
          ticketRef: "LEGAL-2002",
        }),
      })
    );
    expect(duplicatePlace.status).toBe(409);
    const duplicatePayload = (await duplicatePlace.json()) as { error: { code: string } };
    expect(duplicatePayload.error.code).toBe("legal_hold_already_active");

    const forbiddenOverride = await patchLegalHold(
      authedRequest(
        "http://localhost/api/data-governance/legal-hold",
        orgId,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-user-capabilities": "connector-admin" },
          body: JSON.stringify({
            action: "override",
            reason: "Admin lacks compliance capability.",
            ticketRef: "LEGAL-2003",
          }),
        },
        "admin"
      )
    );
    expect(forbiddenOverride.status).toBe(403);

    const overrideResponse = await patchLegalHold(
      authedRequest("http://localhost/api/data-governance/legal-hold", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "override",
          reason: "Urgent regulator exception approved.",
          ticketRef: "LEGAL-2004",
        }),
      })
    );
    expect(overrideResponse.status).toBe(200);
    const overridePayload = (await overrideResponse.json()) as {
      data: { active: null; history: Array<{ status: string; override: { overridden: boolean } }> };
    };
    expect(overridePayload.data.history[0]?.status).toBe("overridden");
    expect(overridePayload.data.history[0]?.override.overridden).toBe(true);
  });
});
