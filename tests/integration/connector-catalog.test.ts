import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as createOrganisation } from "@/app/api/organisations/route";
import { PATCH as patchFeatureFlags } from "@/app/api/feature-flags/route";
import { GET as getConnectorCatalog } from "@/app/api/connectors/catalog/route";
import { POST as createConnector } from "@/app/api/connectors/route";
import { POST as syncConnector } from "@/app/api/connectors/[provider]/sync/route";
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
    body: JSON.stringify({ name: "Connector Catalog Org", industry: "SaaS" }),
  });
  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("connector catalog and availability guards", () => {
  const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
  const originalGoogleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  beforeEach(() => {
    resetMemoryRepository();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  });

  afterEach(() => {
    process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
    process.env.GOOGLE_CLIENT_SECRET = originalGoogleClientSecret;
  });

  it("reports connector availability progression and fails closed when prerequisites regress", async () => {
    const orgId = await createOrg();

    const initialCatalogResponse = await getConnectorCatalog(authedRequest("http://localhost/api/connectors/catalog", orgId));
    expect(initialCatalogResponse.status).toBe(200);
    const initialCatalogPayload = (await initialCatalogResponse.json()) as {
      data: Array<{ provider: string; state: string; reason: string }>;
    };
    const initialGmail = initialCatalogPayload.data.find((item) => item.provider === "gmail");
    expect(initialGmail?.state).toBe("unavailable");
    expect(initialGmail?.reason).toBe("feature_flag_disabled");

    const enableFlagResponse = await patchFeatureFlags(
      authedRequest("http://localhost/api/feature-flags", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "connector_gmail", enabled: true, rolloutPercent: 100 }),
      })
    );
    expect(enableFlagResponse.status).toBe(200);

    const envMissingCatalogResponse = await getConnectorCatalog(authedRequest("http://localhost/api/connectors/catalog", orgId));
    const envMissingCatalogPayload = (await envMissingCatalogResponse.json()) as {
      data: Array<{ provider: string; state: string; reason: string }>;
    };
    const envMissingGmail = envMissingCatalogPayload.data.find((item) => item.provider === "gmail");
    expect(envMissingGmail?.state).toBe("unavailable");
    expect(envMissingGmail?.reason).toBe("env_missing");

    process.env.GOOGLE_CLIENT_ID = "test-google-client";
    process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";

    const availableCatalogResponse = await getConnectorCatalog(authedRequest("http://localhost/api/connectors/catalog", orgId));
    const availableCatalogPayload = (await availableCatalogResponse.json()) as {
      data: Array<{ provider: string; state: string; reason: string; connected: boolean }>;
    };
    const availableGmail = availableCatalogPayload.data.find((item) => item.provider === "gmail");
    expect(availableGmail?.state).toBe("unavailable");
    expect(availableGmail?.reason).toBe("not_connected");
    expect(availableGmail?.connected).toBe(false);

    const createConnectorResponse = await createConnector(
      authedRequest("http://localhost/api/connectors", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "gmail",
          displayName: "Gmail Primary",
          scopes: ["gmail.readonly"],
          sourceSelection: ["inbox"],
          syncSchedule: "hourly",
          tokenRef: "vault://gmail-token",
        }),
      })
    );
    expect(createConnectorResponse.status).toBe(201);

    const connectedCatalogResponse = await getConnectorCatalog(authedRequest("http://localhost/api/connectors/catalog", orgId));
    const connectedCatalogPayload = (await connectedCatalogResponse.json()) as {
      data: Array<{ provider: string; state: string; reason: string; connected: boolean }>;
    };
    const connectedGmail = connectedCatalogPayload.data.find((item) => item.provider === "gmail");
    expect(connectedGmail?.state).toBe("available");
    expect(connectedGmail?.reason).toBe("available");
    expect(connectedGmail?.connected).toBe(true);

    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;

    const syncResponse = await syncConnector(
      authedRequest("http://localhost/api/connectors/gmail/sync", orgId, { method: "POST" }),
      { params: Promise.resolve({ provider: "gmail" }) }
    );
    expect(syncResponse.status).toBe(409);
    const syncPayload = (await syncResponse.json()) as {
      error: { code: string; details?: { reason?: string; state?: string } };
    };
    expect(syncPayload.error.code).toBe("connector_unavailable");
    expect(syncPayload.error.details?.reason).toBe("env_missing");
    expect(syncPayload.error.details?.state).toBe("unavailable");
  });
});
