import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { GET as getReadinessBoard } from "@/app/api/enterprise/readiness-board/route";
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
    body: JSON.stringify({ name: "Readiness Board Org", industry: "SaaS" }),
  });
  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("enterprise readiness board API", () => {
  beforeEach(() => {
    resetMemoryRepository();
  });

  it("returns a structured no-go board with owner-assigned blockers", async () => {
    const orgId = await createOrg();

    const response = await getReadinessBoard(authedRequest("http://localhost/api/enterprise/readiness-board", orgId));
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      data: {
        goNoGo: "go" | "no_go";
        blockers: Array<{
          code: string;
          owner: string;
          remediation: string;
          nextCommand: string;
          status: string;
          evidence: string[];
        }>;
        incidentSeverityPolicy: Array<{ severity: string; owner: string }>;
      };
    };

    expect(payload.data.goNoGo).toBe("no_go");
    expect(payload.data.blockers.length).toBeGreaterThan(0);
    expect(payload.data.blockers.some((item) => item.code === "missing_scim_env")).toBe(true);
    expect(payload.data.blockers.some((item) => item.code === "auto_send_disabled")).toBe(true);
    expect(payload.data.blockers.some((item) => item.code === "mcp_actions_disabled")).toBe(true);
    expect(payload.data.blockers.some((item) => item.code === "scim_write_disabled")).toBe(true);
    expect(payload.data.blockers.every((item) => item.owner.length > 0)).toBe(true);
    expect(payload.data.blockers.every((item) => item.status === "open")).toBe(true);
    expect(payload.data.blockers.every((item) => item.remediation.length > 0)).toBe(true);
    expect(payload.data.blockers.every((item) => item.nextCommand.length > 0)).toBe(true);
    expect(payload.data.blockers.every((item) => item.evidence.length > 0)).toBe(true);
    expect(payload.data.incidentSeverityPolicy.map((item) => item.severity)).toEqual(["sev0", "sev1", "sev2", "sev3"]);
  });

  it("adds queue blockers when failed/dead-letter jobs exist", async () => {
    const orgId = await createOrg();
    const repository = getRepository();
    const job = await repository.enqueueJob({
      organisationId: orgId,
      jobType: "connector_sync",
      payload: { source: "test" },
    });
    await repository.updateJob({
      jobId: job.id,
      organisationId: orgId,
      status: "dead_letter",
      errorMessage: "provider timeout",
    });

    const response = await getReadinessBoard(authedRequest("http://localhost/api/enterprise/readiness-board", orgId));
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      data: { blockers: Array<{ code: string }> };
    };
    expect(payload.data.blockers.some((item) => item.code === "queue_dead_letter_backlog")).toBe(true);
  });
});
