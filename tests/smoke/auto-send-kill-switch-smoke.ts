import { NextRequest } from "next/server";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "smoke-user-auto-send-kill-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
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
  const { POST: createApprovalRule } = await import("@/app/api/approval-rules/route");
  const { POST: decideAutoSend } = await import("@/app/api/auto-send/decide/route");
  const { PATCH: patchKillSwitch } = await import("@/app/api/auto-send/kill-switch/route");
  const { resetMemoryRepository } = await import("@/lib/repository/memory");

  resetMemoryRepository();

  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "smoke-user-auto-send-kill-001" },
      body: JSON.stringify({ name: "Auto Send Kill Switch Smoke Org", industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error("Failed to create organisation for auto-send kill switch smoke.");
  const org = (await create.json()) as { data: { id: string } };
  const orgId = org.data.id;

  await patchFeatureFlags(
    authedRequest("http://localhost/api/feature-flags", orgId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "auto_send", enabled: true, rolloutPercent: 100 }),
    })
  );
  await patchBilling(
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
  await createApprovalRule(
    authedRequest("http://localhost/api/approval-rules", orgId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Low risk email auto-send",
        scenario: "pricing_objection",
        minScore: 90,
        riskLevels: ["low"],
        channelAllowlist: ["email"],
        customerTypeAllowlist: ["smb"],
        requiresHumanApproval: false,
        enabled: true,
      }),
    })
  );

  const enableGlobal = await patchKillSwitch(
    authedRequest("http://localhost/api/auto-send/kill-switch", orgId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: "global",
        active: true,
        reason: "smoke incident stop",
      }),
    })
  );
  if (!enableGlobal.ok) throw new Error("Failed to enable global auto-send kill switch.");

  const decision = await decideAutoSend(
    authedRequest("http://localhost/api/auto-send/decide", orgId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score: 96,
        riskLevel: "low",
        channel: "email",
        customerType: "smb",
        workspaceId: "workspace-smoke-1",
        draft: "Completely understand the concern and recommend a scoped pilot next.",
        recipient: "buyer@example.com",
        evidence: ["policy:pricing_objection"],
      }),
    })
  );
  if (!decision.ok) throw new Error("Auto-send decision request failed.");
  const decisionPayload = (await decision.json()) as {
    data: { decision: { allowed: boolean; reason: string } };
  };
  if (decisionPayload.data.decision.allowed) {
    throw new Error("Expected global auto-send kill switch to block decision.");
  }
  if (!decisionPayload.data.decision.reason.includes("Global auto-send kill switch active")) {
    throw new Error("Expected kill-switch reason in blocked decision.");
  }

  console.log("auto-send-kill-switch-smoke:ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
