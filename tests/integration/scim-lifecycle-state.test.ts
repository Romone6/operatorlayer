import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createOrganisation } from "@/app/api/organisations/route";
import { PATCH as patchFeatureFlags } from "@/app/api/feature-flags/route";
import { POST as scimProvision } from "@/app/api/scim/provision/route";
import { GET as getScimUserById } from "@/app/api/scim/v2/Users/[id]/route";
import { GET as getScimUsers } from "@/app/api/scim/v2/Users/route";
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
    body: JSON.stringify({ name: "SCIM Lifecycle Org", industry: "SaaS" }),
  });
  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("SCIM lifecycle deprovision/reactivation state", () => {
  beforeEach(() => {
    resetMemoryRepository();
    process.env.OPERATORLAYER_SCIM_TOKEN = "test-scim-token";
  });

  it("persists inactive/active lifecycle state with enterprise audit evidence", async () => {
    const orgId = await createOrg();
    const userId = "user-scim-life-001";

    const enableScimWriteResponse = await patchFeatureFlags(
      authedRequest("http://localhost/api/feature-flags", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "scim_write", enabled: true, rolloutPercent: 100 }),
      })
    );
    expect(enableScimWriteResponse.status).toBe(200);

    const provisionResponse = await scimProvision(
      new NextRequest("http://localhost/api/scim/provision", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-scim-token",
          "x-ol-org-id": orgId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "provision_user",
          userId,
          email: "scim-life@example.com",
          role: "member",
        }),
      })
    );
    expect(provisionResponse.status).toBe(200);

    const provisionedUserResponse = await getScimUserById(
      new NextRequest(`http://localhost/api/scim/v2/Users/${userId}`, {
        headers: {
          Authorization: "Bearer test-scim-token",
          "x-ol-org-id": orgId,
        },
      }),
      { params: Promise.resolve({ id: userId }) }
    );
    expect(provisionedUserResponse.status).toBe(200);
    const provisionedUserPayload = (await provisionedUserResponse.json()) as { data: { active: boolean } };
    expect(provisionedUserPayload.data.active).toBe(true);

    const deprovisionResponse = await scimProvision(
      new NextRequest("http://localhost/api/scim/provision", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-scim-token",
          "x-ol-org-id": orgId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "deprovision_user",
          userId,
        }),
      })
    );
    expect(deprovisionResponse.status).toBe(200);

    const deprovisionedUserResponse = await getScimUserById(
      new NextRequest(`http://localhost/api/scim/v2/Users/${userId}`, {
        headers: {
          Authorization: "Bearer test-scim-token",
          "x-ol-org-id": orgId,
        },
      }),
      { params: Promise.resolve({ id: userId }) }
    );
    expect(deprovisionedUserResponse.status).toBe(200);
    const deprovisionedUserPayload = (await deprovisionedUserResponse.json()) as {
      data: { active: boolean; roles: Array<{ value: string }> };
    };
    expect(deprovisionedUserPayload.data.active).toBe(false);
    expect(deprovisionedUserPayload.data.roles[0]?.value).toBe("member");

    const reactivateResponse = await scimProvision(
      new NextRequest("http://localhost/api/scim/provision", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-scim-token",
          "x-ol-org-id": orgId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update_role",
          userId,
          role: "admin",
        }),
      })
    );
    expect(reactivateResponse.status).toBe(200);

    const usersResponse = await getScimUsers(
      new NextRequest("http://localhost/api/scim/v2/Users", {
        headers: {
          Authorization: "Bearer test-scim-token",
          "x-ol-org-id": orgId,
        },
      })
    );
    expect(usersResponse.status).toBe(200);
    const usersPayload = (await usersResponse.json()) as {
      data: { Resources: Array<{ id: string; active: boolean; roles: Array<{ value: string }> }> };
    };
    const lifecycleUser = usersPayload.data.Resources.find((item) => item.id === userId);
    expect(lifecycleUser?.active).toBe(true);
    expect(lifecycleUser?.roles[0]?.value).toBe("admin");

    const auditResponse = await getAuditEvents(
      authedRequest("http://localhost/api/audit/events?limit=100&category=enterprise", orgId)
    );
    expect(auditResponse.status).toBe(200);
    const auditPayload = (await auditResponse.json()) as {
      data: {
        events: Array<{
          action: string;
          metadata: { userId?: string; active?: boolean; reason?: string };
        }>;
      };
    };
    const lifecycleEvents = auditPayload.data.events.filter(
      (event) => event.action === "enterprise:scim_user_status_set" && event.metadata.userId === userId
    );
    expect(lifecycleEvents.some((event) => event.metadata.active === false)).toBe(true);
    expect(lifecycleEvents.some((event) => event.metadata.active === true)).toBe(true);
    expect(lifecycleEvents.some((event) => event.metadata.reason === "deprovisioned")).toBe(true);
    expect(lifecycleEvents.some((event) => event.metadata.reason === "role_update")).toBe(true);
  });
});
