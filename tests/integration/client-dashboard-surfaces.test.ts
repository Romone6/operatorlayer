import { readFile } from "node:fs/promises";

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { GET as listApiKeys } from "@/app/api/api-keys/route";
import { GET as listCalibrationRecommendations } from "@/app/api/calibration/recommendations/route";
import { GET as listLlmProviders } from "@/app/api/llm/providers/route";
import { GET as getMcpCapabilities } from "@/app/api/mcp/capabilities/route";
import { GET as listNotificationDestinations } from "@/app/api/notifications/destinations/route";
import { POST as createOrganisation } from "@/app/api/organisations/route";
import { GET as listSuites } from "@/app/api/test-suites/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "dashboard-owner-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  headers.set("x-user-email", "dashboard-owner@example.com");
  return new NextRequest(url, { ...init, headers });
}

async function createOrg() {
  const response = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "dashboard-owner-001",
        "x-user-email": "dashboard-owner@example.com",
      },
      body: JSON.stringify({ name: "Dashboard Surfaces Org", industry: "SaaS" }),
    })
  );
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("client dashboard product surfaces", () => {
  beforeEach(() => {
    resetMemoryRepository();
    process.env.OPERATORLAYER_DATA_BACKEND = "memory";
    process.env.OPERATORLAYER_SECRET_ENCRYPTION_KEY = "test-secret-encryption-key";
  });

  it("links first-class product-side dashboard pages from the app sidebar", async () => {
    const sidebar = await readFile("components/app/app-sidebar.tsx", "utf8");
    expect(sidebar).toContain("/app/developer");
    expect(sidebar).toContain("/app/testing");
    expect(sidebar).toContain("/app/notifications");

    await expect(readFile("app/app/developer/page.tsx", "utf8")).resolves.toContain("Developer setup");
    await expect(readFile("app/app/testing/page.tsx", "utf8")).resolves.toContain("Dynamic testing");
    await expect(readFile("app/app/notifications/page.tsx", "utf8")).resolves.toContain("Notifications");
    await expect(readFile("app/app/exports/page.tsx", "utf8")).resolves.toContain("Rollback checksum");
  });

  it("loads real empty and availability states for dashboard-backed product surfaces", async () => {
    const orgId = await createOrg();

    const [apiKeys, providers, mcp, suites, recommendations, destinations] = await Promise.all([
      listApiKeys(authedRequest("http://localhost/api/api-keys", orgId)),
      listLlmProviders(authedRequest("http://localhost/api/llm/providers", orgId)),
      getMcpCapabilities(authedRequest("http://localhost/api/mcp/capabilities", orgId)),
      listSuites(authedRequest("http://localhost/api/test-suites", orgId)),
      listCalibrationRecommendations(authedRequest("http://localhost/api/calibration/recommendations", orgId)),
      listNotificationDestinations(authedRequest("http://localhost/api/notifications/destinations", orgId)),
    ]);

    expect(apiKeys.status).toBe(200);
    expect(providers.status).toBe(200);
    expect(mcp.status).toBe(200);
    expect(suites.status).toBe(200);
    expect(recommendations.status).toBe(200);
    expect(destinations.status).toBe(200);

    const apiKeyPayload = (await apiKeys.json()) as { data: unknown[] };
    const providerPayload = (await providers.json()) as { data: { providers: unknown[] } };
    const suitePayload = (await suites.json()) as { data: unknown[] };
    const recommendationPayload = (await recommendations.json()) as { data: unknown[] };
    const destinationPayload = (await destinations.json()) as {
      data: Array<{ destination: string; state: string; reason: string }>;
    };
    expect(apiKeyPayload.data).toEqual([]);
    expect(providerPayload.data.providers).toEqual([]);
    expect(suitePayload.data).toEqual([]);
    expect(recommendationPayload.data).toEqual([]);
    expect(destinationPayload.data.find((item) => item.destination === "webhook")).toMatchObject({
      state: "unavailable",
      reason: "no_active_subscription",
    });
    expect(destinationPayload.data.find((item) => item.destination === "slack")).toMatchObject({
      state: "unavailable",
      reason: "provider_not_implemented",
    });
  });
});
