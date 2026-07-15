import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createOrganisation } from "@/app/api/organisations/route";
import { PATCH as patchFeatureFlags } from "@/app/api/feature-flags/route";
import { POST as createConnector } from "@/app/api/connectors/route";
import { PATCH as patchBilling } from "@/app/api/billing/entitlements/route";
import { PATCH as patchGovernance } from "@/app/api/data-governance/policies/route";
import { POST as createApiKey } from "@/app/api/api-keys/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

type Role = "owner" | "admin" | "reviewer" | "analyst" | "member";

function authedRequest(
  url: string,
  orgId: string,
  role: Role,
  init: RequestInit = {},
  capabilities?: string[]
) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", role === "owner" ? "owner-user-001" : "admin-user-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", role);
  headers.set("x-user-email", `${role}@example.com`);
  if (capabilities !== undefined) {
    headers.set("x-user-capabilities", capabilities.join(","));
  }
  return new NextRequest(url, { ...init, headers });
}

async function createOrg() {
  const response = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "owner-user-001",
        "x-user-email": "owner@example.com",
      },
      body: JSON.stringify({ name: "Capability Org", industry: "SaaS" }),
    })
  );
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("capability-scoped admin API enforcement", () => {
  beforeEach(() => {
    resetMemoryRepository();
    process.env.GOOGLE_CLIENT_ID = "test-google-client";
    process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";
  });

  it("blocks admin actions without capability flags and allows them when capability is present", async () => {
    const orgId = await createOrg();

    const enableGmail = await patchFeatureFlags(
      authedRequest("http://localhost/api/feature-flags", orgId, "owner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "connector_gmail", enabled: true, rolloutPercent: 100 }),
      })
    );
    expect(enableGmail.status).toBe(200);

    const deniedConnector = await createConnector(
      authedRequest(
        "http://localhost/api/connectors",
        orgId,
        "admin",
        {
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
        },
        []
      )
    );
    expect(deniedConnector.status).toBe(403);

    const allowedConnector = await createConnector(
      authedRequest(
        "http://localhost/api/connectors",
        orgId,
        "admin",
        {
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
        },
        ["connector-admin"]
      )
    );
    expect(allowedConnector.status).toBe(201);

    const deniedBilling = await patchBilling(
      authedRequest(
        "http://localhost/api/billing/entitlements",
        orgId,
        "admin",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "enterprise", status: "active" }),
        },
        []
      )
    );
    expect(deniedBilling.status).toBe(403);

    const allowedBilling = await patchBilling(
      authedRequest(
        "http://localhost/api/billing/entitlements",
        orgId,
        "admin",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "enterprise", status: "active" }),
        },
        ["billing-admin"]
      )
    );
    expect(allowedBilling.status).toBe(200);

    const deniedGovernance = await patchGovernance(
      authedRequest(
        "http://localhost/api/data-governance/policies",
        orgId,
        "admin",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            retentionDays: 365,
            legalHoldEnabled: false,
            deletionRequiresApproval: true,
            invitePolicy: "domain_allowlist_only",
            sessionDurationMinutes: 480,
            enforcedMfa: true,
            breakGlassAdminEnabled: true,
          }),
        },
        []
      )
    );
    expect(deniedGovernance.status).toBe(403);

    const allowedGovernance = await patchGovernance(
      authedRequest(
        "http://localhost/api/data-governance/policies",
        orgId,
        "admin",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            retentionDays: 365,
            legalHoldEnabled: false,
            deletionRequiresApproval: true,
            invitePolicy: "domain_allowlist_only",
            sessionDurationMinutes: 480,
            enforcedMfa: true,
            breakGlassAdminEnabled: true,
          }),
        },
        ["compliance-admin"]
      )
    );
    expect(allowedGovernance.status).toBe(200);

    const deniedApiKey = await createApiKey(
      authedRequest(
        "http://localhost/api/api-keys",
        orgId,
        "admin",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Denied Key", scopes: ["evaluation.read"] }),
        },
        []
      )
    );
    expect(deniedApiKey.status).toBe(403);

    const allowedApiKey = await createApiKey(
      authedRequest(
        "http://localhost/api/api-keys",
        orgId,
        "admin",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Allowed Key", scopes: ["evaluation.read"] }),
        },
        ["api-admin"]
      )
    );
    expect(allowedApiKey.status).toBe(201);
  });
});
