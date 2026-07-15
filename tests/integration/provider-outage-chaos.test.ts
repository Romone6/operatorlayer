import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as createOrganisation } from "@/app/api/organisations/route";
import { PATCH as patchFeatureFlags } from "@/app/api/feature-flags/route";
import { POST as createConnector } from "@/app/api/connectors/route";
import { GET as getConnectorHealth } from "@/app/api/connectors/[provider]/health/route";
import { GET as getFailureTaxonomy } from "@/app/api/jobs/failure-taxonomy/route";
import { GET as getJobMetrics } from "@/app/api/jobs/metrics/route";
import { GET as getReadinessBoard } from "@/app/api/enterprise/readiness-board/route";
import { appendEnterpriseEvent } from "@/lib/enterprise/store";
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
    body: JSON.stringify({ name: "Provider Outage Org", industry: "SaaS" }),
  });
  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("provider outage chaos evidence", () => {
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

  it("surfaces provider outage through failure taxonomy, metrics, connector health, and readiness board", async () => {
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
    const failedJob = await repository.enqueueJob({
      organisationId: orgId,
      jobType: "connector_sync",
      payload: { provider: "gmail" },
    });
    await repository.updateJob({
      jobId: failedJob.id,
      organisationId: orgId,
      status: "failed",
      errorMessage: "provider temporarily unavailable",
      payloadPatch: {
        lastErrorCode: "provider_unavailable",
        terminalFailureClass: "provider_unavailable",
      },
    });
    await appendEnterpriseEvent(
      repository,
      { organisationId: orgId, userId: "chaos", role: "admin", email: "chaos@system.local" },
      {
        action: "connector_sync_result",
        payload: {
          provider: "gmail",
          syncStatus: "failed",
          error: "provider_unavailable",
        },
      }
    );

    const taxonomyResponse = await getFailureTaxonomy(
      authedRequest("http://localhost/api/jobs/failure-taxonomy?windowHours=24", orgId)
    );
    expect(taxonomyResponse.status).toBe(200);
    const taxonomyPayload = (await taxonomyResponse.json()) as {
      data: { classes: Array<{ class: string; count: number }> };
    };
    expect(
      taxonomyPayload.data.classes.some((item) => item.class === "provider_unavailable" && item.count >= 1)
    ).toBe(true);

    const metricsResponse = await getJobMetrics(
      authedRequest("http://localhost/api/jobs/metrics?windowHours=24", orgId)
    );
    expect(metricsResponse.status).toBe(200);
    const metricsPayload = (await metricsResponse.json()) as {
      data: { providerErrorRates: Array<{ provider: string; failedSyncJobs: number }> };
    };
    expect(
      metricsPayload.data.providerErrorRates.some(
        (item) => item.provider === "gmail" && item.failedSyncJobs >= 1
      )
    ).toBe(true);

    const healthResponse = await getConnectorHealth(
      authedRequest("http://localhost/api/connectors/gmail/health", orgId),
      { params: Promise.resolve({ provider: "gmail" }) }
    );
    expect(healthResponse.status).toBe(200);
    const healthPayload = (await healthResponse.json()) as {
      data: { health: { failureReasons: string[] } };
    };
    expect(healthPayload.data.health.failureReasons).toContain("provider_unavailable");

    const readinessResponse = await getReadinessBoard(
      authedRequest("http://localhost/api/enterprise/readiness-board", orgId)
    );
    expect(readinessResponse.status).toBe(200);
    const readinessPayload = (await readinessResponse.json()) as {
      data: { blockers: Array<{ code: string }> };
    };
    expect(readinessPayload.data.blockers.some((item) => item.code === "queue_failed_jobs_present")).toBe(true);
  });
});
