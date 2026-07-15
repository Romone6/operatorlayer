import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as createOrganisation } from "@/app/api/organisations/route";
import { PATCH as patchFeatureFlags } from "@/app/api/feature-flags/route";
import { POST as createConnector } from "@/app/api/connectors/route";
import { GET as getConnectorHealth } from "@/app/api/connectors/[provider]/health/route";
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
    body: JSON.stringify({ name: "Connector Health Org", industry: "SaaS" }),
  });
  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("connector health model", () => {
  const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
  const originalGoogleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  beforeEach(() => {
    resetMemoryRepository();
    process.env.GOOGLE_CLIENT_ID = "test-google-client";
    process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";
  });

  afterEach(() => {
    process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
    process.env.GOOGLE_CLIENT_SECRET = originalGoogleClientSecret;
  });

  it("returns expanded connector health diagnostics", async () => {
    const orgId = await createOrg();

    const enableFlagResponse = await patchFeatureFlags(
      authedRequest("http://localhost/api/feature-flags", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "connector_gmail", enabled: true, rolloutPercent: 100 }),
      })
    );
    expect(enableFlagResponse.status).toBe(200);

    const createConnectorResponse = await createConnector(
      authedRequest("http://localhost/api/connectors", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "gmail",
          displayName: "Gmail Primary",
          scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
          sourceSelection: ["inbox"],
          syncSchedule: "hourly",
          tokenRef: "vault://gmail-token",
        }),
      })
    );
    expect(createConnectorResponse.status).toBe(201);

    const repository = getRepository();
    await repository.createIngestionLog({
      organisationId: orgId,
      sourceId: null,
      action: "enterprise:connector_upsert",
      details: {
        provider: "gmail",
        displayName: "Gmail Primary",
        scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
        sourceSelection: ["inbox"],
        syncSchedule: "hourly",
        status: "connected",
        connectionHealth: "degraded",
        metadata: {
          grantedScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
          tokenExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
          throttlingState: "rate_limited",
        },
        actorId: "test-user-001",
      },
    });
    await repository.createIngestionLog({
      organisationId: orgId,
      sourceId: null,
      action: "enterprise:connector_sync_result",
      details: {
        provider: "gmail",
        syncStatus: "succeeded",
        actorId: "test-user-001",
      },
    });
    await repository.createIngestionLog({
      organisationId: orgId,
      sourceId: null,
      action: "enterprise:connector_sync_result",
      details: {
        provider: "gmail",
        syncStatus: "failed",
        error: "provider_throttled",
        actorId: "test-user-001",
      },
    });

    const healthResponse = await getConnectorHealth(
      authedRequest("http://localhost/api/connectors/gmail/health", orgId),
      { params: Promise.resolve({ provider: "gmail" }) }
    );
    expect(healthResponse.status).toBe(200);
    const payload = (await healthResponse.json()) as {
      data: {
        state: string;
        connected: boolean;
        sync: {
          lastSuccessfulSyncAt: string | null;
          syncLagMinutes: number | null;
        };
        health: {
          scopeStatus: string;
          tokenExpiry: string;
          throttlingState: string;
          failureReasons: string[];
        };
      };
    };
    expect(payload.data.state).toBe("connected");
    expect(payload.data.connected).toBe(true);
    expect(payload.data.sync.lastSuccessfulSyncAt).toBeTruthy();
    expect(typeof payload.data.sync.syncLagMinutes).toBe("number");
    expect(payload.data.health.scopeStatus).toBe("complete");
    expect(payload.data.health.tokenExpiry).toBe("expiring_soon");
    expect(payload.data.health.throttlingState).toBe("rate_limited");
    expect(payload.data.health.failureReasons).toContain("provider_throttled");
  });
});
