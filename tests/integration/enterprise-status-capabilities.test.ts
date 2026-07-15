import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { GET as getEnterpriseStatus } from "@/app/api/enterprise/status/route";
import { PATCH as patchFeatureFlags } from "@/app/api/feature-flags/route";
import { PATCH as patchBilling } from "@/app/api/billing/entitlements/route";
import { PATCH as patchSso } from "@/app/api/sso/config/route";
import { POST as createConnector } from "@/app/api/connectors/route";
import { POST as createOrganisation } from "@/app/api/organisations/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

function authedRequest(url: string, orgId: string, init: RequestInit = {}, role = "owner") {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "test-user-status-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", role);
  return new NextRequest(url, { ...init, headers });
}

async function createOrg() {
  const request = new NextRequest("http://localhost/api/organisations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": "test-user-status-001",
    },
    body: JSON.stringify({ name: "Enterprise Status Org", industry: "SaaS" }),
  });
  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("enterprise status capability matrix API", () => {
  beforeEach(() => {
    resetMemoryRepository();
  });

  it("labels unavailable capabilities explicitly and flips to available when prerequisites are satisfied", async () => {
    const orgId = await createOrg();

    const initialResponse = await getEnterpriseStatus(
      authedRequest("http://localhost/api/enterprise/status", orgId)
    );
    expect(initialResponse.status).toBe(200);
    const initialPayload = (await initialResponse.json()) as {
      data: {
        capabilityStates: Array<{
          id: string;
          state: "available" | "unavailable";
          reason: string;
        }>;
      };
    };

    const initialMcp = initialPayload.data.capabilityStates.find((item) => item.id === "mcp_actions");
    const initialGmail = initialPayload.data.capabilityStates.find((item) => item.id === "connector_gmail");
    expect(initialMcp?.state).toBe("unavailable");
    expect(initialMcp?.reason).toBe("feature_flag_disabled");
    expect(initialGmail?.state).toBe("unavailable");
    expect(initialGmail?.reason).toBe("feature_flag_disabled");

    const keysToRestore = [
      "OPENAI_API_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "OPERATORLAYER_SCIM_TOKEN",
    ] as const;
    const previousValues = Object.fromEntries(keysToRestore.map((key) => [key, process.env[key]])) as Record<
      (typeof keysToRestore)[number],
      string | undefined
    >;

    try {
      process.env.OPENAI_API_KEY = "status-test-openai";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://status-test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "status-test-anon";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "status-test-service-role";
      process.env.GOOGLE_CLIENT_ID = "status-test-google-id";
      process.env.GOOGLE_CLIENT_SECRET = "status-test-google-secret";
      process.env.OPERATORLAYER_SCIM_TOKEN = "status-test-scim-token";

      for (const key of ["mcp_actions", "auto_send", "scim_write", "connector_gmail"] as const) {
        const flagResponse = await patchFeatureFlags(
          authedRequest("http://localhost/api/feature-flags", orgId, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, enabled: true, rolloutPercent: 100 }),
          })
        );
        expect(flagResponse.status).toBe(200);
      }

      const billingResponse = await patchBilling(
        authedRequest("http://localhost/api/billing/entitlements", orgId, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: "enterprise",
            status: "active",
            autoSendEnabled: true,
            apiAccessEnabled: true,
            mcpAccessEnabled: true,
          }),
        })
      );
      expect(billingResponse.status).toBe(200);

      const ssoResponse = await patchSso(
        authedRequest("http://localhost/api/sso/config", orgId, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled: true,
            idpEntityId: "https://idp.example.com",
            ssoUrl: "https://idp.example.com/saml",
            certificateFingerprint: "AA:BB:CC:DD:EE:FF:11:22",
            domainAllowlist: ["example.com"],
          }),
        })
      );
      expect(ssoResponse.status).toBe(200);

      const enabledResponse = await getEnterpriseStatus(
        authedRequest("http://localhost/api/enterprise/status", orgId)
      );
      expect(enabledResponse.status).toBe(200);
      const enabledPayload = (await enabledResponse.json()) as {
        data: {
          capabilityStates: Array<{
            id: string;
            state: "available" | "unavailable";
            reason: string;
          }>;
        };
      };

      const mcp = enabledPayload.data.capabilityStates.find((item) => item.id === "mcp_actions");
      const autoSend = enabledPayload.data.capabilityStates.find((item) => item.id === "auto_send");
      const scim = enabledPayload.data.capabilityStates.find((item) => item.id === "scim_write");
      const saml = enabledPayload.data.capabilityStates.find((item) => item.id === "saml_sso");
      const gmail = enabledPayload.data.capabilityStates.find((item) => item.id === "connector_gmail");
      const slack = enabledPayload.data.capabilityStates.find((item) => item.id === "connector_slack");

      expect(mcp?.state).toBe("available");
      expect(mcp?.reason).toBe("enabled");
      expect(autoSend?.state).toBe("available");
      expect(scim?.state).toBe("available");
      expect(saml?.state).toBe("available");
      expect(gmail?.state).toBe("unavailable");
      expect(gmail?.reason).toBe("connector_not_connected");
      expect(slack?.state).toBe("unavailable");
      expect(slack?.reason).toBe("feature_flag_disabled");

      const connectGmailResponse = await createConnector(
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
      expect(connectGmailResponse.status).toBe(201);

      const connectedResponse = await getEnterpriseStatus(
        authedRequest("http://localhost/api/enterprise/status", orgId)
      );
      expect(connectedResponse.status).toBe(200);
      const connectedPayload = (await connectedResponse.json()) as {
        data: {
          capabilityStates: Array<{
            id: string;
            state: "available" | "unavailable";
            reason: string;
          }>;
        };
      };
      const connectedGmail = connectedPayload.data.capabilityStates.find(
        (item) => item.id === "connector_gmail"
      );
      expect(connectedGmail?.state).toBe("available");
      expect(connectedGmail?.reason).toBe("enabled");
    } finally {
      for (const key of keysToRestore) {
        const value = previousValues[key];
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });
});
