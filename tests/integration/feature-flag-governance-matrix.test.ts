import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { PATCH as patchFeatureFlags } from "@/app/api/feature-flags/route";
import { GET as getFeatureFlagMatrix } from "@/app/api/feature-flags/matrix/route";
import { POST as createOrganisation } from "@/app/api/organisations/route";
import { resetMemoryRepository } from "@/lib/repository/memory";
import type { FeatureFlagKey } from "@/lib/types";

function authedRequest(url: string, orgId: string, init: RequestInit = {}, role = "owner") {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "owner-user-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", role);
  return new NextRequest(url, { ...init, headers });
}

async function createOrg() {
  const response = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "owner-user-001",
      },
      body: JSON.stringify({ name: "Flag Matrix Org", industry: "SaaS" }),
    })
  );
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("feature flag governance matrix API", () => {
  beforeEach(() => {
    resetMemoryRepository();
  });

  it("returns owner-scoped governance metadata with effective tenant rollout state", async () => {
    const orgId = await createOrg();

    const enable = await patchFeatureFlags(
      authedRequest("http://localhost/api/feature-flags", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "connector_gmail" satisfies FeatureFlagKey,
          enabled: true,
          rolloutPercent: 25,
        }),
      })
    );
    expect(enable.status).toBe(200);

    const matrixResponse = await getFeatureFlagMatrix(
      authedRequest("http://localhost/api/feature-flags/matrix", orgId)
    );
    expect(matrixResponse.status).toBe(200);
    const matrixPayload = (await matrixResponse.json()) as {
      data: Array<{
        key: string;
        owner: string;
        blastRadius: string;
        tenantScopedRollout: boolean;
        rolloutField: string;
        defaultEnabled: boolean;
        effective: { enabled: boolean; rolloutPercent: number };
      }>;
    };

    expect(matrixPayload.data.length).toBe(10);
    expect(
      matrixPayload.data.every(
        (item) => item.owner.length > 0 && item.tenantScopedRollout && item.rolloutField === "rolloutPercent"
      )
    ).toBe(true);
    const gmail = matrixPayload.data.find((item) => item.key === "connector_gmail");
    expect(gmail?.owner).toBe("connector-oncall");
    expect(gmail?.blastRadius).toBe("tenant_only");
    expect(gmail?.effective.enabled).toBe(true);
    expect(gmail?.effective.rolloutPercent).toBe(25);

    const mcp = matrixPayload.data.find((item) => item.key === "mcp_actions");
    expect(mcp?.blastRadius).toBe("cross_tenant_control_plane");
  });

  it("blocks non-admin roles from reading the matrix", async () => {
    const orgId = await createOrg();
    const denied = await getFeatureFlagMatrix(
      authedRequest("http://localhost/api/feature-flags/matrix", orgId, {}, "member")
    );
    expect(denied.status).toBe(403);
  });
});
