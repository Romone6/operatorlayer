import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createOrganisation } from "@/app/api/organisations/route";
import { GET as getConnectorHealth } from "@/app/api/connectors/[provider]/health/route";
import { GET as getEffectiveEntitlement } from "@/app/api/billing/entitlements/effective/route";
import { PATCH as patchBilling } from "@/app/api/billing/entitlements/route";
import { GET as getReadiness } from "@/app/api/enterprise/readiness/route";
import { PATCH as patchFeatureFlags } from "@/app/api/feature-flags/route";
import { GET as getMcpCapabilities } from "@/app/api/mcp/capabilities/route";
import { GET as getMcpAudit } from "@/app/api/mcp/audit/route";
import { GET as getReviewQueue } from "@/app/api/review-queue/route";
import { GET as getWebhookReplayHistory } from "@/app/api/webhooks/[id]/replay/route";
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
    body: JSON.stringify({ name: "Enterprise Contracts Org", industry: "SaaS" }),
  });
  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("enterprise response contracts", () => {
  beforeEach(() => {
    resetMemoryRepository();
  });

  it("returns discriminated connector sync state and standard error envelope", async () => {
    const orgId = await createOrg();

    const disconnected = await getConnectorHealth(authedRequest("http://localhost/api/connectors/gmail/health", orgId), {
      params: Promise.resolve({ provider: "gmail" }),
    });
    expect(disconnected.status).toBe(200);
    const disconnectedPayload = (await disconnected.json()) as {
      data: {
        state: string;
        connected: boolean;
        provider: string;
        sync: { lastSuccessfulSyncAt: string | null; syncLagMinutes: number | null };
        health: { scopeStatus: string; tokenExpiry: string; throttlingState: string; failureReasons: string[] };
      };
    };
    expect(disconnectedPayload.data.provider).toBe("gmail");
    expect(disconnectedPayload.data.state).toBe("disconnected");
    expect(disconnectedPayload.data.connected).toBe(false);
    expect(disconnectedPayload.data.sync.lastSuccessfulSyncAt).toBeNull();
    expect(disconnectedPayload.data.sync.syncLagMinutes).toBeNull();
    expect(Array.isArray(disconnectedPayload.data.health.failureReasons)).toBe(true);

    const invalid = await getConnectorHealth(authedRequest("http://localhost/api/connectors/not-real/health", orgId), {
      params: Promise.resolve({ provider: "not-real" }),
    });
    expect(invalid.status).toBe(400);
    const invalidPayload = (await invalid.json()) as {
      error: {
        code: string;
        message: string;
        severity: string;
        recoverable: boolean;
        traceId: string;
      };
    };
    expect(invalidPayload.error.code).toBe("invalid_connector_provider");
    expect(typeof invalidPayload.error.traceId).toBe("string");
    expect(invalidPayload.error.traceId.length).toBeGreaterThan(10);
    expect(invalidPayload.error.severity).toBe("medium");
    expect(invalidPayload.error.recoverable).toBe(true);
    expect(invalid.headers.get("x-operatorlayer-trace-id")).toBe(invalidPayload.error.traceId);
  });

  it("keeps standardized error envelope fields across 403 and 404 enterprise API failures", async () => {
    const orgId = await createOrg();

    const capabilityDenied = await getMcpAudit(
      new NextRequest("http://localhost/api/mcp/audit", {
        headers: {
          "x-user-id": "test-user-001",
          "x-org-id": orgId,
          "x-user-role": "admin",
          "x-user-capabilities": "",
        },
      })
    );
    expect(capabilityDenied.status).toBe(403);
    const capabilityDeniedPayload = (await capabilityDenied.json()) as {
      error: {
        code: string;
        message: string;
        severity: string;
        recoverable: boolean;
        traceId: string;
      };
    };
    expect(capabilityDeniedPayload.error.code).toBe("capability_forbidden");
    expect(capabilityDeniedPayload.error.message).toContain("Missing required capability");
    expect(capabilityDeniedPayload.error.severity).toBe("medium");
    expect(capabilityDeniedPayload.error.recoverable).toBe(true);
    expect(capabilityDenied.headers.get("x-operatorlayer-trace-id")).toBe(
      capabilityDeniedPayload.error.traceId
    );

    const runtimeUnavailable = await getMcpAudit(
      new NextRequest("http://localhost/api/mcp/audit", {
        headers: {
          "x-user-id": "test-user-001",
          "x-org-id": orgId,
          "x-user-role": "admin",
          "x-user-capabilities": "api-admin",
        },
      })
    );
    expect(runtimeUnavailable.status).toBe(409);
    const runtimeUnavailablePayload = (await runtimeUnavailable.json()) as {
      error: {
        code: string;
        message: string;
        severity: string;
        recoverable: boolean;
        traceId: string;
      };
    };
    expect(runtimeUnavailablePayload.error.code).toBe("mcp_unavailable");
    expect(runtimeUnavailablePayload.error.message).toContain("MCP actions are unavailable");
    expect(runtimeUnavailablePayload.error.severity).toBe("medium");
    expect(runtimeUnavailablePayload.error.recoverable).toBe(true);
    expect(runtimeUnavailable.headers.get("x-operatorlayer-trace-id")).toBe(
      runtimeUnavailablePayload.error.traceId
    );

    const webhookMissing = await getWebhookReplayHistory(
      authedRequest("http://localhost/api/webhooks/00000000-0000-4000-8000-000000000001/replay", orgId),
      { params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000001" }) }
    );
    expect(webhookMissing.status).toBe(404);
    const webhookMissingPayload = (await webhookMissing.json()) as {
      error: {
        code: string;
        message: string;
        severity: string;
        recoverable: boolean;
        traceId: string;
      };
    };
    expect(webhookMissingPayload.error.code).toBe("webhook_not_found");
    expect(webhookMissingPayload.error.message).toContain("not found");
    expect(webhookMissingPayload.error.severity).toBe("medium");
    expect(webhookMissingPayload.error.recoverable).toBe(true);
    expect(webhookMissing.headers.get("x-operatorlayer-trace-id")).toBe(
      webhookMissingPayload.error.traceId
    );
  });

  it("returns discriminated entitlement state and typed readiness blockers", async () => {
    const orgId = await createOrg();

    const entitlementResponse = await getEffectiveEntitlement(
      authedRequest("http://localhost/api/billing/entitlements/effective", orgId)
    );
    expect(entitlementResponse.status).toBe(200);
    const entitlementPayload = (await entitlementResponse.json()) as {
      data: {
        state: {
          state: "active" | "past_due" | "suspended";
          enforcement: "granted" | "payment_required" | "suspended";
        };
      };
    };
    expect(entitlementPayload.data.state.state).toBe("active");
    expect(entitlementPayload.data.state.enforcement).toBe("granted");

    const readinessResponse = await getReadiness(authedRequest("http://localhost/api/enterprise/readiness", orgId));
    expect(readinessResponse.status).toBe(200);
    const readinessPayload = (await readinessResponse.json()) as {
      data: {
        blockers: Array<{ category: string; recoverable: boolean }>;
      };
    };
    expect(Array.isArray(readinessPayload.data.blockers)).toBe(true);
    expect(readinessPayload.data.blockers.every((item) => typeof item.category === "string")).toBe(true);
    expect(readinessPayload.data.blockers.every((item) => typeof item.recoverable === "boolean")).toBe(true);
  });

  it("returns MCP capability states with explicit unavailable reasons", async () => {
    const orgId = await createOrg();

    const initialResponse = await getMcpCapabilities(authedRequest("http://localhost/api/mcp/capabilities", orgId));
    expect(initialResponse.status).toBe(200);
    const initialPayload = (await initialResponse.json()) as {
      data: {
        capabilities: Array<{ id: string }>;
        capabilityStates: Array<{
          id: string;
          requiredFlag: string | null;
          requiredScope: string | null;
          state: "available" | "unavailable";
          reason: "enabled" | "feature_flag_disabled" | "feature_flag_partial_rollout";
        }>;
      };
    };
    expect(initialPayload.data.capabilities).toHaveLength(0);
    const initiallyDisabled = initialPayload.data.capabilityStates.find((item) => item.id === "draft.evaluate");
    expect(initiallyDisabled?.requiredFlag).toBe("mcp_actions");
    expect(initiallyDisabled?.state).toBe("unavailable");
    expect(initiallyDisabled?.reason).toBe("feature_flag_disabled");

    const partialRollout = await patchFeatureFlags(
      authedRequest("http://localhost/api/feature-flags", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "mcp_actions", enabled: true, rolloutPercent: 25 }),
      })
    );
    expect(partialRollout.status).toBe(200);

    const partialResponse = await getMcpCapabilities(authedRequest("http://localhost/api/mcp/capabilities", orgId));
    expect(partialResponse.status).toBe(200);
    const partialPayload = (await partialResponse.json()) as {
      data: {
        capabilities: Array<{ id: string }>;
        capabilityStates: Array<{
          id: string;
          state: "available" | "unavailable";
          reason: "enabled" | "feature_flag_disabled" | "feature_flag_partial_rollout";
        }>;
      };
    };
    expect(partialPayload.data.capabilities.some((item) => item.id === "draft.evaluate")).toBe(false);
    const partialCapability = partialPayload.data.capabilityStates.find((item) => item.id === "draft.evaluate");
    expect(partialCapability?.state).toBe("unavailable");
    expect(partialCapability?.reason).toBe("feature_flag_partial_rollout");

    const fullRollout = await patchFeatureFlags(
      authedRequest("http://localhost/api/feature-flags", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "mcp_actions", enabled: true, rolloutPercent: 100 }),
      })
    );
    expect(fullRollout.status).toBe(200);

    const entitlementBlockedResponse = await getMcpCapabilities(
      authedRequest("http://localhost/api/mcp/capabilities", orgId)
    );
    expect(entitlementBlockedResponse.status).toBe(200);
    const entitlementBlockedPayload = (await entitlementBlockedResponse.json()) as {
      data: {
        capabilities: Array<{ id: string }>;
        capabilityStates: Array<{
          id: string;
          state: "available" | "unavailable";
          reason:
            | "enabled"
            | "feature_flag_disabled"
            | "feature_flag_partial_rollout"
            | "billing_not_active"
            | "entitlement_disabled";
        }>;
      };
    };
    expect(entitlementBlockedPayload.data.capabilities.some((item) => item.id === "draft.evaluate")).toBe(false);
    const entitlementBlockedCapability = entitlementBlockedPayload.data.capabilityStates.find(
      (item) => item.id === "draft.evaluate"
    );
    expect(entitlementBlockedCapability?.state).toBe("unavailable");
    expect(entitlementBlockedCapability?.reason).toBe("entitlement_disabled");

    const entitlementEnabled = await patchBilling(
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
    expect(entitlementEnabled.status).toBe(200);

    const enabledResponse = await getMcpCapabilities(authedRequest("http://localhost/api/mcp/capabilities", orgId));
    expect(enabledResponse.status).toBe(200);
    const enabledPayload = (await enabledResponse.json()) as {
      data: {
        capabilities: Array<{ id: string }>;
        capabilityStates: Array<{
          id: string;
          state: "available" | "unavailable";
          reason: "enabled" | "feature_flag_disabled" | "feature_flag_partial_rollout";
        }>;
      };
    };
    expect(enabledPayload.data.capabilities.some((item) => item.id === "draft.evaluate")).toBe(true);
    const enabledCapability = enabledPayload.data.capabilityStates.find((item) => item.id === "draft.evaluate");
    expect(enabledCapability?.state).toBe("available");
    expect(enabledCapability?.reason).toBe("enabled");
  });

  it("returns flattened review items with discriminant kind", async () => {
    const orgId = await createOrg();

    const response = await getReviewQueue(authedRequest("http://localhost/api/review-queue", orgId));
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      data: { items: Array<{ kind: string }> };
    };
    expect(Array.isArray(payload.data.items)).toBe(true);
    expect(payload.data.items.length).toBe(0);
  });
});
