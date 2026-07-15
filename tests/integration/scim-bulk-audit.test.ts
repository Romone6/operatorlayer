import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createOrganisation } from "@/app/api/organisations/route";
import { PATCH as patchFeatureFlags } from "@/app/api/feature-flags/route";
import { POST as scimBulk } from "@/app/api/scim/v2/Bulk/route";
import { GET as getAuditEvents } from "@/app/api/audit/events/route";
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
    body: JSON.stringify({ name: "SCIM Bulk Audit Org", industry: "SaaS" }),
  });
  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("SCIM bulk audit entries", () => {
  beforeEach(() => {
    resetMemoryRepository();
    process.env.OPERATORLAYER_SCIM_TOKEN = "test-scim-token";
  });

  it("records strict per-operation audit entries for success and failure", async () => {
    const orgId = await createOrg();
    const enableScim = await patchFeatureFlags(
      authedRequest("http://localhost/api/feature-flags", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "scim_write", enabled: true, rolloutPercent: 100 }),
      })
    );
    expect(enableScim.status).toBe(200);

    const response = await scimBulk(
      new NextRequest("http://localhost/api/scim/v2/Bulk", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-scim-token",
          "x-ol-org-id": orgId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schemas: ["urn:ietf:params:scim:api:messages:2.0:BulkRequest"],
          Operations: [
            {
              method: "POST",
              path: "/Users",
              bulkId: "bulk-user-success",
              data: {
                emails: [{ value: "bulk-audit-user@example.com" }],
                roles: [{ value: "member" }],
              },
            },
            {
              method: "PATCH",
              path: "/Unsupported",
              bulkId: "bulk-unsupported",
              data: {},
            },
          ],
        }),
      })
    );
    expect(response.status).toBe(200);

    const auditResponse = await getAuditEvents(
      authedRequest("http://localhost/api/audit/events?limit=100&category=enterprise", orgId)
    );
    expect(auditResponse.status).toBe(200);
    const auditPayload = (await auditResponse.json()) as {
      data: {
        events: Array<{
          action: string;
          metadata: {
            bulkId?: string | null;
            statusCode?: number;
            outcome?: string;
          };
        }>;
      };
    };

    const scimBulkEvents = auditPayload.data.events.filter(
      (event) => event.action === "enterprise:scim_bulk_operation"
    );
    expect(scimBulkEvents.length).toBeGreaterThanOrEqual(2);
    expect(scimBulkEvents.some((event) => event.metadata.bulkId === "bulk-user-success")).toBe(true);
    expect(scimBulkEvents.some((event) => event.metadata.bulkId === "bulk-unsupported")).toBe(true);
    expect(scimBulkEvents.some((event) => event.metadata.statusCode === 201 && event.metadata.outcome === "succeeded")).toBe(
      true
    );
    expect(scimBulkEvents.some((event) => event.metadata.statusCode === 400 && event.metadata.outcome === "failed")).toBe(
      true
    );
  });

  it("fails closed when scim_write is not fully enabled and emits runtime denial evidence", async () => {
    const orgId = await createOrg();

    const response = await scimBulk(
      new NextRequest("http://localhost/api/scim/v2/Bulk", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-scim-token",
          "x-ol-org-id": orgId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schemas: ["urn:ietf:params:scim:api:messages:2.0:BulkRequest"],
          Operations: [{ method: "POST", path: "/Users", bulkId: "bulk-disabled", data: { emails: [] } }],
        }),
      })
    );
    expect(response.status).toBe(409);
    const payload = (await response.json()) as { error: { code: string } };
    expect(payload.error.code).toBe("scim_write_unavailable");

    const auditResponse = await getAuditEvents(
      authedRequest("http://localhost/api/audit/events?limit=100&category=enterprise", orgId)
    );
    expect(auditResponse.status).toBe(200);
    const auditPayload = (await auditResponse.json()) as {
      data: {
        events: Array<{
          action: string;
          metadata: { capabilityId?: string; reason?: string; surface?: string };
        }>;
      };
    };
    expect(
      auditPayload.data.events.some(
        (event) =>
          event.action === "enterprise:capability_runtime_denied" &&
          event.metadata.capabilityId === "scim_write" &&
          event.metadata.surface === "scim_v2_bulk"
      )
    ).toBe(true);
  });
});
