import { access, readFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";

import { NextRequest } from "next/server";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "smoke-dashboard-owner-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  headers.set("x-user-email", "dashboard-owner@example.com");
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

async function main() {
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = process.env.OPERATORLAYER_TEST_AUTH_BYPASS ?? "1";
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS ?? "1";
  process.env.OPERATORLAYER_DATA_BACKEND = process.env.OPERATORLAYER_DATA_BACKEND ?? "memory";
  process.env.OPERATORLAYER_SECRET_ENCRYPTION_KEY =
    process.env.OPERATORLAYER_SECRET_ENCRYPTION_KEY ?? "test-secret-encryption-key";

  for (const path of [
    "app/app/developer/page.tsx",
    "app/app/testing/page.tsx",
    "app/app/notifications/page.tsx",
    "app/app/exports/page.tsx",
  ]) {
    await access(path, fsConstants.F_OK);
  }

  const sidebar = await readFile("components/app/app-sidebar.tsx", "utf8");
  for (const route of ["/app/developer", "/app/testing", "/app/notifications"]) {
    if (!sidebar.includes(route)) throw new Error(`Sidebar does not link ${route}.`);
  }

  const { POST: createOrganisation } = await import("@/app/api/organisations/route");
  const { GET: listApiKeys } = await import("@/app/api/api-keys/route");
  const { GET: listLlmProviders } = await import("@/app/api/llm/providers/route");
  const { GET: getMcpCapabilities } = await import("@/app/api/mcp/capabilities/route");
  const { GET: listSuites } = await import("@/app/api/test-suites/route");
  const { GET: listRecommendations } = await import("@/app/api/calibration/recommendations/route");
  const { GET: listNotificationDestinations } = await import("@/app/api/notifications/destinations/route");
  const { resetMemoryRepository } = await import("@/lib/repository/memory");

  resetMemoryRepository();
  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "smoke-dashboard-owner-001",
        "x-user-email": "dashboard-owner@example.com",
      },
      body: JSON.stringify({ name: "Dashboard Smoke Org", industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error("Failed to create dashboard smoke organisation.");
  const org = (await create.json()) as { data: { id: string } };
  const orgId = org.data.id;

  const apiKeys = await listApiKeys(authedRequest("http://localhost/api/api-keys", orgId));
  const providers = await listLlmProviders(authedRequest("http://localhost/api/llm/providers", orgId));
  const mcp = await getMcpCapabilities(authedRequest("http://localhost/api/mcp/capabilities", orgId));
  const suites = await listSuites(authedRequest("http://localhost/api/test-suites", orgId));
  const recommendations = await listRecommendations(
    authedRequest("http://localhost/api/calibration/recommendations", orgId)
  );
  const destinations = await listNotificationDestinations(
    authedRequest("http://localhost/api/notifications/destinations", orgId)
  );
  for (const response of [apiKeys, providers, mcp, suites, recommendations, destinations]) {
    if (!response.ok) throw new Error("A dashboard backing API did not return successfully.");
  }

  const destinationPayload = (await destinations.json()) as {
    data: Array<{ destination: string; state: string; reason: string }>;
  };
  if (destinationPayload.data.find((item) => item.destination === "webhook")?.reason !== "no_active_subscription") {
    throw new Error("Webhook empty state is not explicit.");
  }
  if (destinationPayload.data.find((item) => item.destination === "slack")?.reason !== "provider_not_implemented") {
    throw new Error("Slack unavailable state is not explicit.");
  }

  console.log("client-dashboard-surfaces-smoke:ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
