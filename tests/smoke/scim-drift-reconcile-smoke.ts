import { NextRequest } from "next/server";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "smoke-user-scim-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

async function main() {
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = process.env.OPERATORLAYER_TEST_AUTH_BYPASS ?? "1";
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS ?? "1";
  process.env.OPERATORLAYER_DATA_BACKEND = process.env.OPERATORLAYER_DATA_BACKEND ?? "memory";
  process.env.OPERATORLAYER_SCIM_TOKEN = process.env.OPERATORLAYER_SCIM_TOKEN ?? "smoke-scim-token";

  const { POST: createOrganisation } = await import("@/app/api/organisations/route");
  const { PATCH: patchFeatureFlags } = await import("@/app/api/feature-flags/route");
  const { POST: reconcileScim } = await import("@/app/api/scim/v2/reconcile/route");
  const { GET: getAuditEvents } = await import("@/app/api/audit/events/route");
  const { getRepository } = await import("@/lib/repository");
  const { resetMemoryRepository } = await import("@/lib/repository/memory");
  const { appendEnterpriseEvent } = await import("@/lib/enterprise/store");

  resetMemoryRepository();

  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "smoke-user-scim-001" },
      body: JSON.stringify({ name: "SCIM Drift Smoke Org", industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error("Failed to create organisation for SCIM drift smoke.");
  const org = (await create.json()) as { data: { id: string } };
  const repository = getRepository();
  const enableScim = await patchFeatureFlags(
    authedRequest("http://localhost/api/feature-flags", org.data.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "scim_write", enabled: true, rolloutPercent: 100 }),
    })
  );
  if (!enableScim.ok) throw new Error("Failed to enable scim_write feature flag for SCIM drift smoke.");

  await repository.upsertUserMembership({
    organisationId: org.data.id,
    userId: "smoke-missing-status-user",
    email: "smoke-missing-status@example.com",
    role: "member",
  });
  await appendEnterpriseEvent(
    repository,
    { organisationId: org.data.id, userId: "scim", role: "admin", email: "scim@system.local" },
    {
      action: "scim_user_status_set",
      payload: { userId: "smoke-ghost-user", active: true, reason: "orphaned" },
    }
  );

  const reconcileResponse = await reconcileScim(
    new NextRequest("http://localhost/api/scim/v2/reconcile?apply=1", {
      method: "POST",
      headers: {
        Authorization: "Bearer smoke-scim-token",
        "x-ol-org-id": org.data.id,
      },
    })
  );
  if (!reconcileResponse.ok) throw new Error("SCIM drift reconcile endpoint failed.");
  const reconcilePayload = (await reconcileResponse.json()) as {
    data: { summary: { totalIssues: number; resolvedIssues: number } };
  };
  if (reconcilePayload.data.summary.totalIssues < 1) {
    throw new Error("SCIM drift reconcile smoke expected at least one drift issue.");
  }
  if (reconcilePayload.data.summary.resolvedIssues < 1) {
    throw new Error("SCIM drift reconcile smoke expected at least one resolved drift issue.");
  }

  const auditResponse = await getAuditEvents(
    authedRequest("http://localhost/api/audit/events?limit=50&category=enterprise", org.data.id)
  );
  if (!auditResponse.ok) throw new Error("SCIM drift reconcile audit fetch failed.");
  const auditPayload = (await auditResponse.json()) as {
    data: { events: Array<{ action: string }> };
  };
  if (!auditPayload.data.events.some((event) => event.action === "enterprise:scim_drift_reconcile_run")) {
    throw new Error("SCIM drift reconcile audit marker not found.");
  }

  console.log(JSON.stringify(reconcilePayload, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
