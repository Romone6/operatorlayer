import { NextRequest } from "next/server";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "smoke-user-001");
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
  const { PATCH: patchSso } = await import("@/app/api/sso/config/route");
  const { PATCH: patchBilling } = await import("@/app/api/billing/entitlements/route");
  const { GET: getReadiness } = await import("@/app/api/enterprise/readiness/route");
  const { resetMemoryRepository } = await import("@/lib/repository/memory");

  resetMemoryRepository();
  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "smoke-user-001" },
      body: JSON.stringify({ name: "Smoke Enterprise Org", industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error("Failed to create organisation for readiness smoke.");
  const org = (await create.json()) as { data: { id: string } };
  const orgId = org.data.id;

  const flags = [
    "connector_gmail",
    "connector_slack",
    "connector_outlook",
    "connector_hubspot",
    "connector_salesforce",
    "connector_intercom",
    "connector_zendesk",
    "auto_send",
    "mcp_actions",
    "scim_write",
  ];
  for (const key of flags) {
    const response = await patchFeatureFlags(
      authedRequest("http://localhost/api/feature-flags", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled: true, rolloutPercent: 100 }),
      })
    );
    if (!response.ok) throw new Error(`Failed to enable flag ${key}`);
  }

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
  if (!ssoResponse.ok) throw new Error("Failed to configure SSO.");

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
  if (!billingResponse.ok) throw new Error("Failed to configure billing.");

  const readiness = await getReadiness(authedRequest("http://localhost/api/enterprise/readiness", orgId));
  const payload = (await readiness.json()) as { data: { ready: boolean; blockers: Array<{ code: string }> } };
  console.log(JSON.stringify(payload, null, 2));
  if (!readiness.ok) {
    throw new Error("Readiness endpoint failed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
