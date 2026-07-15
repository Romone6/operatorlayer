import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { GET as getOnboardingChecklist } from "@/app/api/enterprise/onboarding-checklist/route";
import { POST as createOrganisation } from "@/app/api/organisations/route";
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
    body: JSON.stringify({ name: "Onboarding Checklist Org", industry: "SaaS" }),
  });
  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("enterprise onboarding checklist API", () => {
  beforeEach(() => {
    resetMemoryRepository();
  });

  it("returns step-based checklist with readiness percentage and blocker actions", async () => {
    const orgId = await createOrg();

    const response = await getOnboardingChecklist(
      authedRequest("http://localhost/api/enterprise/onboarding-checklist", orgId)
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      data: {
        goNoGo: "go" | "no_go";
        readinessMeter: { completed: number; total: number; completionPct: number };
        steps: Array<{
          id: string;
          complete: boolean;
          blockerCodes: string[];
          nextCommands: string[];
        }>;
      };
    };

    expect(payload.data.goNoGo).toBe("no_go");
    expect(payload.data.readinessMeter.total).toBe(7);
    expect(payload.data.steps).toHaveLength(7);
    expect(payload.data.steps.some((item) => item.id === "core_runtime_env")).toBe(true);
    expect(payload.data.steps.some((item) => item.id === "connector_connections")).toBe(true);
    expect(payload.data.steps.some((item) => item.id === "queue_replay_health")).toBe(true);
    expect(payload.data.steps.some((item) => item.nextCommands.length > 0)).toBe(true);
    const coreRuntimeStep = payload.data.steps.find((item) => item.id === "core_runtime_env");
    const featureFlagStep = payload.data.steps.find((item) => item.id === "connector_feature_flags");
    expect(coreRuntimeStep?.blockerCodes.includes("missing_scim_env")).toBe(true);
    expect(featureFlagStep?.blockerCodes.includes("auto_send_disabled")).toBe(true);
    expect(featureFlagStep?.blockerCodes.includes("mcp_actions_disabled")).toBe(true);
    expect(featureFlagStep?.blockerCodes.includes("scim_write_disabled")).toBe(true);
  });

  it("marks queue replay health as blocked when dead-letter jobs exist", async () => {
    const orgId = await createOrg();
    const repository = getRepository();
    const job = await repository.enqueueJob({
      organisationId: orgId,
      jobType: "connector_sync",
      payload: { provider: "gmail" },
    });
    await repository.updateJob({
      jobId: job.id,
      organisationId: orgId,
      status: "dead_letter",
      errorMessage: "provider timeout",
    });

    const response = await getOnboardingChecklist(
      authedRequest("http://localhost/api/enterprise/onboarding-checklist", orgId)
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      data: {
        steps: Array<{
          id: string;
          complete: boolean;
          blockerCodes: string[];
          nextCommands: string[];
        }>;
      };
    };
    const queueStep = payload.data.steps.find((item) => item.id === "queue_replay_health");
    expect(queueStep?.complete).toBe(false);
    expect(queueStep?.blockerCodes.includes("queue_dead_letter_backlog")).toBe(true);
    expect(queueStep?.nextCommands.length).toBeGreaterThan(0);
  });

  it("blocks non-admin roles", async () => {
    const orgId = await createOrg();
    const response = await getOnboardingChecklist(
      authedRequest("http://localhost/api/enterprise/onboarding-checklist", orgId, {}, "member")
    );
    expect(response.status).toBe(403);
  });
});
