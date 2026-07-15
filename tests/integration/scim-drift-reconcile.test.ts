import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createOrganisation } from "@/app/api/organisations/route";
import { PATCH as patchFeatureFlags } from "@/app/api/feature-flags/route";
import { POST as reconcileScim } from "@/app/api/scim/v2/reconcile/route";
import { GET as getScimUserById } from "@/app/api/scim/v2/Users/[id]/route";
import { GET as getAuditEvents } from "@/app/api/audit/events/route";
import { appendEnterpriseEvent } from "@/lib/enterprise/store";
import { getRepository } from "@/lib/repository";
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
    body: JSON.stringify({ name: "SCIM Drift Reconcile Org", industry: "SaaS" }),
  });
  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("SCIM drift reconcile", () => {
  beforeEach(() => {
    resetMemoryRepository();
    process.env.OPERATORLAYER_SCIM_TOKEN = "test-scim-token";
  });

  it("detects drift and applies remediations with audit trail", async () => {
    const orgId = await createOrg();
    const repository = getRepository();
    const enableScim = await patchFeatureFlags(
      authedRequest("http://localhost/api/feature-flags", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "scim_write", enabled: true, rolloutPercent: 100 }),
      })
    );
    expect(enableScim.status).toBe(200);

    await appendEnterpriseEvent(
      repository,
      { organisationId: orgId, userId: "scim", role: "admin", email: "scim@system.local" },
      {
        action: "scim_user_status_set",
        payload: {
          userId: "test-user-001",
          active: true,
          reason: "baseline_sync",
        },
      }
    );

    await repository.upsertUserMembership({
      organisationId: orgId,
      userId: "missing-status-user",
      email: "missing-status@example.com",
      role: "member",
    });

    await repository.upsertUserMembership({
      organisationId: orgId,
      userId: "inactive-admin-user",
      email: "inactive-admin@example.com",
      role: "admin",
    });

    await appendEnterpriseEvent(
      repository,
      { organisationId: orgId, userId: "scim", role: "admin", email: "scim@system.local" },
      {
        action: "scim_user_status_set",
        payload: {
          userId: "inactive-admin-user",
          active: false,
          reason: "deprovisioned",
        },
      }
    );

    await appendEnterpriseEvent(
      repository,
      { organisationId: orgId, userId: "scim", role: "admin", email: "scim@system.local" },
      {
        action: "scim_user_status_set",
        payload: {
          userId: "ghost-user",
          active: true,
          reason: "orphaned",
        },
      }
    );

    await appendEnterpriseEvent(
      repository,
      { organisationId: orgId, userId: "scim", role: "admin", email: "scim@system.local" },
      {
        action: "scim_group_upsert",
        payload: {
          id: "group-1",
          displayName: "Ops Group",
          members: ["ghost-user"],
          created: new Date().toISOString(),
        },
      }
    );

    const reconcileResponse = await reconcileScim(
      new NextRequest("http://localhost/api/scim/v2/reconcile?apply=1", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-scim-token",
          "x-ol-org-id": orgId,
        },
      })
    );
    expect(reconcileResponse.status).toBe(200);
    const reconcilePayload = (await reconcileResponse.json()) as {
      data: {
        apply: boolean;
        summary: {
          totalIssues: number;
          remediableIssues: number;
          unremediableIssues: number;
          resolvedIssues: number;
        };
        issues: Array<{ code: string; resolved: boolean }>;
      };
    };
    expect(reconcilePayload.data.apply).toBe(true);
    expect(reconcilePayload.data.summary.totalIssues).toBe(4);
    expect(reconcilePayload.data.summary.remediableIssues).toBe(2);
    expect(reconcilePayload.data.summary.unremediableIssues).toBe(2);
    expect(reconcilePayload.data.summary.resolvedIssues).toBe(2);
    expect(
      reconcilePayload.data.issues.some((issue) => issue.code === "missing_status_event" && issue.resolved)
    ).toBe(true);
    expect(
      reconcilePayload.data.issues.some((issue) => issue.code === "inactive_role_not_member" && issue.resolved)
    ).toBe(true);

    const userResponse = await getScimUserById(
      new NextRequest("http://localhost/api/scim/v2/Users/inactive-admin-user", {
        headers: {
          Authorization: "Bearer test-scim-token",
          "x-ol-org-id": orgId,
        },
      }),
      { params: Promise.resolve({ id: "inactive-admin-user" }) }
    );
    expect(userResponse.status).toBe(200);
    const userPayload = (await userResponse.json()) as {
      data: { active: boolean; roles: Array<{ value: string }> };
    };
    expect(userPayload.data.active).toBe(false);
    expect(userPayload.data.roles[0]?.value).toBe("member");

    const auditResponse = await getAuditEvents(
      authedRequest("http://localhost/api/audit/events?limit=100&category=enterprise", orgId)
    );
    expect(auditResponse.status).toBe(200);
    const auditPayload = (await auditResponse.json()) as {
      data: { events: Array<{ action: string; metadata: { reason?: string; apply?: boolean } }> };
    };
    expect(auditPayload.data.events.some((event) => event.action === "enterprise:scim_drift_reconcile_run")).toBe(
      true
    );
    expect(
      auditPayload.data.events.some(
        (event) =>
          event.action === "enterprise:scim_user_status_set" &&
          event.metadata.reason === "drift_reconciled_missing_status"
      )
    ).toBe(true);
    expect(
      auditPayload.data.events.some(
        (event) =>
          event.action === "enterprise:scim_user_status_set" &&
          event.metadata.reason === "drift_reconciled_deprovision_role_downgrade"
      )
    ).toBe(true);
  });
});
