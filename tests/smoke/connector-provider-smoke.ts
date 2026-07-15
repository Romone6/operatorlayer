import { NextRequest } from "next/server";

import type { ConnectorProvider } from "@/lib/types";

const providers: ConnectorProvider[] = [
  "gmail",
  "slack",
  "outlook",
  "hubspot",
  "salesforce",
  "intercom",
  "zendesk",
];

const connectorEnv: Record<ConnectorProvider, [string, string]> = {
  gmail: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  slack: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
  outlook: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
  hubspot: ["HUBSPOT_CLIENT_ID", "HUBSPOT_CLIENT_SECRET"],
  salesforce: ["SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET"],
  intercom: ["INTERCOM_CLIENT_ID", "INTERCOM_CLIENT_SECRET"],
  zendesk: ["ZENDESK_CLIENT_ID", "ZENDESK_CLIENT_SECRET"],
};

const zendeskTenantEnv = {
  ZENDESK_AUTHORIZE_URL: "https://operatorlayer-smoke.zendesk.com/oauth/authorizations/new",
  ZENDESK_TOKEN_URL: "https://operatorlayer-smoke.zendesk.com/oauth/tokens",
  ZENDESK_API_BASE_URL: "https://operatorlayer-smoke.zendesk.com/api/v2",
};

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "smoke-user-connector-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

async function main() {
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = process.env.OPERATORLAYER_TEST_AUTH_BYPASS ?? "1";
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS ?? "1";
  process.env.OPERATORLAYER_DATA_BACKEND = process.env.OPERATORLAYER_DATA_BACKEND ?? "memory";
  process.env.OPERATORLAYER_OAUTH_STATE_SECRET =
    process.env.OPERATORLAYER_OAUTH_STATE_SECRET ?? "smoke-oauth-state-secret";

  const { POST: createOrganisation } = await import("@/app/api/organisations/route");
  const { PATCH: patchFeatureFlags } = await import("@/app/api/feature-flags/route");
  const { GET: startOauth } = await import("@/app/api/connectors/[provider]/oauth/start/route");
  const { GET: getHealth } = await import("@/app/api/connectors/[provider]/health/route");
  const { POST: syncConnector } = await import("@/app/api/connectors/[provider]/sync/route");
  const { resetMemoryRepository } = await import("@/lib/repository/memory");

  resetMemoryRepository();

  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "smoke-user-connector-001" },
      body: JSON.stringify({ name: "Connector Smoke Org", industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error("Failed to create organisation for connector smoke.");
  const org = (await create.json()) as { data: { id: string } };
  const orgId = org.data.id;

  for (const provider of providers) {
    const response = await startOauth(
      authedRequest(
        `http://localhost/api/connectors/${provider}/oauth/start?redirectUri=${encodeURIComponent("http://localhost/app/settings")}`,
        orgId
      ),
      { params: Promise.resolve({ provider }) }
    );
    if (response.status !== 409) {
      throw new Error(`Expected ${provider} oauth/start to be unavailable when flag is disabled. status=${response.status}`);
    }
    const payload = (await response.json()) as { error?: { code?: string; details?: { reason?: string } } };
    if (payload.error?.code !== "connector_unavailable") {
      throw new Error(`Expected connector_unavailable for ${provider} when flag disabled.`);
    }
    if (payload.error?.details?.reason !== "feature_flag_disabled") {
      throw new Error(`Expected feature_flag_disabled reason for ${provider}.`);
    }
  }

  for (const provider of providers) {
    const enable = await patchFeatureFlags(
      authedRequest("http://localhost/api/feature-flags", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: `connector_${provider}`, enabled: true, rolloutPercent: 100 }),
      })
    );
    if (!enable.ok) throw new Error(`Failed to enable connector_${provider} flag.`);
  }

  for (const provider of providers) {
    const response = await startOauth(
      authedRequest(
        `http://localhost/api/connectors/${provider}/oauth/start?redirectUri=${encodeURIComponent("http://localhost/app/settings")}`,
        orgId
      ),
      { params: Promise.resolve({ provider }) }
    );
    if (response.status !== 409) {
      throw new Error(`Expected ${provider} oauth/start to be unavailable when env is missing. status=${response.status}`);
    }
    const payload = (await response.json()) as { error?: { code?: string; details?: { reason?: string } } };
    if (payload.error?.code !== "connector_unavailable") {
      throw new Error(`Expected connector_unavailable for ${provider} when env missing.`);
    }
    if (payload.error?.details?.reason !== "env_missing") {
      throw new Error(`Expected env_missing reason for ${provider}.`);
    }
  }

  for (const provider of providers) {
    const [clientIdKey, clientSecretKey] = connectorEnv[provider];
    process.env[clientIdKey] = `smoke-${provider}-client-id`;
    process.env[clientSecretKey] = `smoke-${provider}-client-secret`;
  }
  for (const [key, value] of Object.entries(zendeskTenantEnv)) {
    process.env[key] = value;
  }

  for (const provider of providers) {
    const start = await startOauth(
      authedRequest(
        `http://localhost/api/connectors/${provider}/oauth/start?redirectUri=${encodeURIComponent("http://localhost/app/settings")}`,
        orgId
      ),
      { params: Promise.resolve({ provider }) }
    );
    if (!start.ok) throw new Error(`Expected ${provider} oauth/start to succeed after env+flag enablement.`);
    const startPayload = (await start.json()) as { data: { authUrl?: string; state?: string } };
    if (!startPayload.data.authUrl || !startPayload.data.state) {
      throw new Error(`Expected authUrl/state for ${provider} oauth/start.`);
    }

    const health = await getHealth(authedRequest(`http://localhost/api/connectors/${provider}/health`, orgId), {
      params: Promise.resolve({ provider }),
    });
    if (!health.ok) throw new Error(`Expected ${provider} health endpoint to succeed.`);
    const healthPayload = (await health.json()) as {
      data: { provider: string; availability: { state: string; reason: string }; connected: boolean };
    };
    if (healthPayload.data.provider !== provider) {
      throw new Error(`Health provider mismatch for ${provider}.`);
    }
    if (healthPayload.data.availability.state !== "unavailable" || healthPayload.data.availability.reason !== "not_connected") {
      throw new Error(`Expected ${provider} availability to be unavailable/not_connected.`);
    }
    if (healthPayload.data.connected) {
      throw new Error(`Expected ${provider} to be disconnected before OAuth callback.`);
    }

    const sync = await syncConnector(authedRequest(`http://localhost/api/connectors/${provider}/sync`, orgId, { method: "POST" }), {
      params: Promise.resolve({ provider }),
    });
    if (sync.status !== 409) {
      throw new Error(`Expected ${provider} sync to return 409 when connector is unavailable/not_connected. status=${sync.status}`);
    }
    const syncPayload = (await sync.json()) as { error?: { code?: string; details?: { reason?: string } } };
    if (syncPayload.error?.code !== "connector_unavailable") {
      throw new Error(`Expected connector_unavailable for ${provider} sync when not connected.`);
    }
    if (syncPayload.error?.details?.reason !== "not_connected") {
      throw new Error(`Expected not_connected reason for ${provider} sync while disconnected.`);
    }
  }

  console.log("connector-provider-smoke:ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
