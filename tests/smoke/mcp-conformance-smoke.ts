import { NextRequest } from "next/server";

function authedRequest(
  url: string,
  orgId: string,
  role: "owner" | "admin",
  init: RequestInit = {},
  capabilities?: string[]
) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", role === "owner" ? "smoke-user-mcp-owner-001" : "smoke-user-mcp-admin-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", role);
  if (capabilities !== undefined) headers.set("x-user-capabilities", capabilities.join(","));
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

function externalMcpRequest(url: string, orgId: string, apiKey: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-ol-api-key", apiKey);
  headers.set("x-ol-org-id", orgId);
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

async function main() {
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = process.env.OPERATORLAYER_TEST_AUTH_BYPASS ?? "1";
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS ?? "1";
  process.env.OPERATORLAYER_DATA_BACKEND = process.env.OPERATORLAYER_DATA_BACKEND ?? "memory";

  const { POST: createOrganisation } = await import("@/app/api/organisations/route");
  const { PATCH: patchFeatureFlags } = await import("@/app/api/feature-flags/route");
  const { PATCH: patchBilling } = await import("@/app/api/billing/entitlements/route");
  const { POST: createApiKey } = await import("@/app/api/api-keys/route");
  const { POST: invokeMcp } = await import("@/app/api/mcp/route");
  const { GET: getCapabilities } = await import("@/app/api/mcp/capabilities/route");
  const { GET: getAudit } = await import("@/app/api/mcp/audit/route");
  const { getRepository } = await import("@/lib/repository");
  const { resetMemoryRepository } = await import("@/lib/repository/memory");

  resetMemoryRepository();

  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "smoke-user-mcp-owner-001" },
      body: JSON.stringify({ name: "MCP Smoke Org", industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error("Failed to create organisation for MCP smoke.");
  const org = (await create.json()) as { data: { id: string } };
  const orgId = org.data.id;

  const noFlag = await getCapabilities(authedRequest("http://localhost/api/mcp/capabilities", orgId, "owner"));
  if (!noFlag.ok) throw new Error("MCP capabilities request without flag failed.");
  const noFlagPayload = (await noFlag.json()) as {
    data: {
      capabilities: Array<{ id: string }>;
      capabilityStates: Array<{ id: string; state: "available" | "unavailable"; reason: string }>;
    };
  };
  if (noFlagPayload.data.capabilities.length !== 0) {
    throw new Error("Expected no MCP capabilities before mcp_actions flag enablement.");
  }
  const noFlagDraftEvaluate = noFlagPayload.data.capabilityStates.find((item) => item.id === "draft.evaluate");
  if (noFlagDraftEvaluate?.state !== "unavailable" || noFlagDraftEvaluate.reason !== "feature_flag_disabled") {
    throw new Error("Expected draft.evaluate to be unavailable with feature_flag_disabled before flag enablement.");
  }

  const runtimeDeniedAudit = await getAudit(
    authedRequest("http://localhost/api/mcp/audit", orgId, "admin", {}, ["api-admin"])
  );
  if (runtimeDeniedAudit.status !== 409) {
    throw new Error("Expected MCP audit request to fail closed when mcp_actions is unavailable.");
  }
  const runtimeDeniedPayload = (await runtimeDeniedAudit.json()) as { error?: { code?: string } };
  if (runtimeDeniedPayload.error?.code !== "mcp_unavailable") {
    throw new Error("Expected MCP audit runtime deny code mcp_unavailable before mcp_actions enablement.");
  }

  const partialRolloutFlag = await patchFeatureFlags(
    authedRequest("http://localhost/api/feature-flags", orgId, "owner", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "mcp_actions", enabled: true, rolloutPercent: 50 }),
    })
  );
  if (!partialRolloutFlag.ok) throw new Error("Failed to set mcp_actions feature flag partial rollout.");

  const partialRollout = await getCapabilities(authedRequest("http://localhost/api/mcp/capabilities", orgId, "owner"));
  if (!partialRollout.ok) throw new Error("MCP capabilities request with partial rollout failed.");
  const partialRolloutPayload = (await partialRollout.json()) as {
    data: {
      capabilities: Array<{ id: string }>;
      capabilityStates: Array<{ id: string; state: "available" | "unavailable"; reason: string }>;
    };
  };
  if (partialRolloutPayload.data.capabilities.some((item) => item.id === "draft.evaluate")) {
    throw new Error("Expected draft.evaluate to remain hidden while mcp_actions rollout is partial.");
  }
  const partialRolloutDraftEvaluate = partialRolloutPayload.data.capabilityStates.find(
    (item) => item.id === "draft.evaluate"
  );
  if (
    partialRolloutDraftEvaluate?.state !== "unavailable" ||
    partialRolloutDraftEvaluate.reason !== "feature_flag_partial_rollout"
  ) {
    throw new Error(
      "Expected draft.evaluate to be unavailable with feature_flag_partial_rollout when rolloutPercent < 100."
    );
  }

  const enableFlag = await patchFeatureFlags(
    authedRequest("http://localhost/api/feature-flags", orgId, "owner", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "mcp_actions", enabled: true, rolloutPercent: 100 }),
    })
  );
  if (!enableFlag.ok) throw new Error("Failed to enable mcp_actions feature flag.");

  const withoutEntitlement = await getCapabilities(authedRequest("http://localhost/api/mcp/capabilities", orgId, "owner"));
  if (!withoutEntitlement.ok) throw new Error("MCP capabilities request without entitlement failed.");
  const withoutEntitlementPayload = (await withoutEntitlement.json()) as {
    data: {
      capabilities: Array<{ id: string }>;
      capabilityStates: Array<{ id: string; state: "available" | "unavailable"; reason: string }>;
    };
  };
  if (withoutEntitlementPayload.data.capabilities.some((item) => item.id === "draft.evaluate")) {
    throw new Error("Expected draft.evaluate to remain unavailable when MCP/API entitlement is disabled.");
  }
  const entitlementBlocked = withoutEntitlementPayload.data.capabilityStates.find(
    (item) => item.id === "draft.evaluate"
  );
  if (entitlementBlocked?.state !== "unavailable" || entitlementBlocked.reason !== "entitlement_disabled") {
    throw new Error("Expected draft.evaluate unavailable reason entitlement_disabled before billing enablement.");
  }

  const enableEntitlement = await patchBilling(
    authedRequest("http://localhost/api/billing/entitlements", orgId, "owner", {
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
  if (!enableEntitlement.ok) throw new Error("Failed to enable enterprise billing entitlements for MCP conformance.");

  const withFlag = await getCapabilities(authedRequest("http://localhost/api/mcp/capabilities", orgId, "owner"));
  if (!withFlag.ok) throw new Error("MCP capabilities request with flag + entitlement failed.");
  const withFlagPayload = (await withFlag.json()) as {
    data: {
      capabilities: Array<{ id: string }>;
      capabilityStates: Array<{ id: string; state: "available" | "unavailable"; reason: string }>;
    };
  };
  if (!withFlagPayload.data.capabilities.some((item) => item.id === "draft.evaluate")) {
    throw new Error("Expected draft.evaluate capability after mcp_actions flag + entitlement enablement.");
  }
  const withFlagDraftEvaluate = withFlagPayload.data.capabilityStates.find((item) => item.id === "draft.evaluate");
  if (withFlagDraftEvaluate?.state !== "available" || withFlagDraftEvaluate.reason !== "enabled") {
    throw new Error("Expected draft.evaluate capability state to be available with enabled reason.");
  }

  const keyResponse = await createApiKey(
    authedRequest("http://localhost/api/api-keys", orgId, "owner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "MCP Smoke Key", scopes: ["evaluation.write"] }),
    })
  );
  if (!keyResponse.ok) throw new Error("Failed to create API key for MCP invocation smoke.");
  const keyPayload = (await keyResponse.json()) as { data: { rawKey: string } };

  const invocation = await invokeMcp(
    externalMcpRequest("http://localhost/api/mcp", orgId, keyPayload.data.rawKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toolId: "draft.evaluate",
        input: {
          inputMessage: "Can you discount this?",
          draft: "We can definitely discount this. No risk at all.",
        },
      }),
    })
  );
  if (!invocation.ok) throw new Error("Expected MCP draft.evaluate invocation to succeed.");
  const invocationPayload = (await invocation.json()) as {
    data: { toolId: string; invocationId: string; result: { evaluation: { scores: { total: number } } } };
  };
  if (invocationPayload.data.toolId !== "draft.evaluate" || !invocationPayload.data.invocationId) {
    throw new Error("MCP invocation response missing tool id or invocation id.");
  }
  if (typeof invocationPayload.data.result.evaluation.scores.total !== "number") {
    throw new Error("MCP invocation response missing evaluation score.");
  }

  const deniedAudit = await getAudit(
    authedRequest("http://localhost/api/mcp/audit", orgId, "admin", {}, [])
  );
  if (deniedAudit.status !== 403) {
    throw new Error("Expected admin MCP audit request without api-admin capability to return 403.");
  }

  const repository = getRepository();
  await repository.createIngestionLog({
    organisationId: orgId,
    sourceId: null,
    action: "enterprise:mcp_tool_invoked",
    details: {
      toolId: "draft.evaluate",
      actorId: "smoke-user-mcp-owner-001",
    },
  });

  const allowedAudit = await getAudit(
    authedRequest("http://localhost/api/mcp/audit", orgId, "admin", {}, ["api-admin"])
  );
  if (!allowedAudit.ok) throw new Error("Expected admin MCP audit request with api-admin capability to succeed.");
  const auditPayload = (await allowedAudit.json()) as { data: { count: number } };
  if (auditPayload.data.count < 1) {
    throw new Error("Expected MCP audit to include at least one MCP audit entry.");
  }

  console.log("mcp-conformance-smoke:ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
