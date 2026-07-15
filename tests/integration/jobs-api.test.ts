import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as listJobs } from "@/app/api/jobs/route";
import { GET as getFailureTaxonomy } from "@/app/api/jobs/failure-taxonomy/route";
import { GET as getJobMetrics } from "@/app/api/jobs/metrics/route";
import { POST as runWorker } from "@/app/api/jobs/worker/route";
import { POST as createOrganisation } from "@/app/api/organisations/route";
import { POST as uploadSource } from "@/app/api/sources/upload/route";
import { getRepository } from "@/lib/repository";
import { resetMemoryRepository } from "@/lib/repository/memory";

function authedRequest(url: string, orgId: string, init: RequestInit = {}, role = "admin") {
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
    body: JSON.stringify({ name: "Jobs Org", industry: "SaaS" }),
  });

  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

async function uploadPastedSource(orgId: string, title: string) {
  const form = new FormData();
  form.set("title", title);
  form.set("sourceType", "pasted_text");
  form.set("authorityLevel", "high");
  form.set("pastedText", "Price concern acknowledged. Offer scoped pilot and next step.");

  const response = await uploadSource(
    authedRequest("http://localhost/api/sources/upload", orgId, {
      method: "POST",
      body: form,
    })
  );
  expect(response.status).toBe(201);
}

describe("jobs APIs", () => {
  beforeEach(() => {
    resetMemoryRepository();
  });

  afterEach(() => {
    process.env.OPERATORLAYER_INLINE_JOB_RUNNER = "1";
  });

  it("allows owner/admin to list jobs and blocks member role", async () => {
    const orgId = await createOrg();

    const adminResponse = await listJobs(authedRequest("http://localhost/api/jobs", orgId));
    expect(adminResponse.status).toBe(200);

    const memberResponse = await listJobs(authedRequest("http://localhost/api/jobs", orgId, {}, "member"));
    expect(memberResponse.status).toBe(403);
  });

  it("validates worker max and enforces role checks", async () => {
    const orgId = await createOrg();

    const invalidMaxResponse = await runWorker(
      authedRequest("http://localhost/api/jobs/worker?max=0", orgId, { method: "POST" })
    );
    expect(invalidMaxResponse.status).toBe(400);

    const memberResponse = await runWorker(
      authedRequest("http://localhost/api/jobs/worker?max=1", orgId, { method: "POST" }, "member")
    );
    expect(memberResponse.status).toBe(403);
  });

  it("processes multiple queued jobs up to max", async () => {
    process.env.OPERATORLAYER_INLINE_JOB_RUNNER = "0";
    const orgId = await createOrg();

    await uploadPastedSource(orgId, "Manual A");
    await uploadPastedSource(orgId, "Manual B");

    const workerResponse = await runWorker(
      authedRequest("http://localhost/api/jobs/worker?max=2", orgId, { method: "POST" })
    );
    expect(workerResponse.status).toBe(200);
    const workerPayload = (await workerResponse.json()) as {
      data: {
        processedCount: number;
        results: Array<{ processed: boolean }>;
      };
    };

    expect(workerPayload.data.processedCount).toBe(2);
    expect(workerPayload.data.results.length).toBe(2);
    expect(workerPayload.data.results.every((result) => result.processed)).toBe(true);
  });

  it("returns queue observability metrics and validates access", async () => {
    const orgId = await createOrg();
    const repository = getRepository();

    const succeeded = await repository.enqueueJob({
      organisationId: orgId,
      jobType: "connector_sync",
      payload: { provider: "gmail" },
    });
    await repository.updateJob({
      jobId: succeeded.id,
      organisationId: orgId,
      status: "running",
      payloadPatch: { firstStartedAt: new Date(Date.now() - 180_000).toISOString() },
    });
    await repository.updateJob({
      jobId: succeeded.id,
      organisationId: orgId,
      status: "succeeded",
    });

    const deadLetter = await repository.enqueueJob({
      organisationId: orgId,
      jobType: "connector_sync",
      payload: { provider: "gmail" },
    });
    await repository.updateJob({
      jobId: deadLetter.id,
      organisationId: orgId,
      status: "running",
      payloadPatch: { firstStartedAt: new Date(Date.now() - 120_000).toISOString() },
    });
    await repository.updateJob({
      jobId: deadLetter.id,
      organisationId: orgId,
      status: "dead_letter",
      errorMessage: "provider rate limited",
      payloadPatch: {
        lastErrorCode: "provider_rate_limited",
        terminalFailureClass: "provider_rate_limited",
      },
    });

    const memberDenied = await getJobMetrics(
      authedRequest("http://localhost/api/jobs/metrics?windowHours=24", orgId, {}, "member")
    );
    expect(memberDenied.status).toBe(403);

    const invalidWindow = await getJobMetrics(
      authedRequest("http://localhost/api/jobs/metrics?windowHours=0", orgId)
    );
    expect(invalidWindow.status).toBe(400);

    const response = await getJobMetrics(
      authedRequest("http://localhost/api/jobs/metrics?windowHours=24", orgId)
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      data: {
        terminalFailures: {
          total: number;
          classes: Array<{ class: string; count: number }>;
        };
        providerErrorRates: Array<{
          provider: string;
          totalSyncJobs: number;
          failedSyncJobs: number;
          errorRatePct: number | null;
        }>;
      };
    };

    expect(payload.data.terminalFailures.total).toBe(1);
    expect(
      payload.data.terminalFailures.classes.some(
        (item) => item.class === "provider_rate_limited" && item.count === 1
      )
    ).toBe(true);
    expect(payload.data.providerErrorRates.find((item) => item.provider === "gmail")).toEqual({
      provider: "gmail",
      totalSyncJobs: 2,
      failedSyncJobs: 1,
      errorRatePct: 50,
    });
  });

  it("returns failure taxonomy and replay candidates for operator triage", async () => {
    const orgId = await createOrg();
    const repository = getRepository();

    const failed = await repository.enqueueJob({
      organisationId: orgId,
      jobType: "connector_sync",
      payload: { provider: "gmail" },
    });
    await repository.updateJob({
      jobId: failed.id,
      organisationId: orgId,
      status: "running",
    });
    await repository.updateJob({
      jobId: failed.id,
      organisationId: orgId,
      status: "failed",
      errorMessage: "provider temporarily unavailable",
      payloadPatch: {
        lastErrorCode: "provider_unavailable",
      },
    });

    const deadLetter = await repository.enqueueJob({
      organisationId: orgId,
      jobType: "connector_sync",
      payload: { provider: "slack" },
    });
    await repository.updateJob({
      jobId: deadLetter.id,
      organisationId: orgId,
      status: "running",
    });
    await repository.updateJob({
      jobId: deadLetter.id,
      organisationId: orgId,
      status: "dead_letter",
      errorMessage: "provider rate limited",
      payloadPatch: {
        lastErrorCode: "provider_rate_limited",
        terminalFailureClass: "provider_rate_limited",
      },
    });

    const memberDenied = await getFailureTaxonomy(
      authedRequest("http://localhost/api/jobs/failure-taxonomy?windowHours=24", orgId, {}, "member")
    );
    expect(memberDenied.status).toBe(403);

    const invalidWindow = await getFailureTaxonomy(
      authedRequest("http://localhost/api/jobs/failure-taxonomy?windowHours=0", orgId)
    );
    expect(invalidWindow.status).toBe(400);

    const response = await getFailureTaxonomy(
      authedRequest("http://localhost/api/jobs/failure-taxonomy?windowHours=24", orgId)
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      data: {
        totals: { failed: number; deadLetter: number; replayable: number };
        classes: Array<{ class: string; status: string; count: number }>;
        replayCandidates: Array<{ jobId: string; replayEndpoint: string; failureClass: string }>;
      };
    };

    expect(payload.data.totals).toEqual({
      failed: 1,
      deadLetter: 1,
      replayable: 2,
    });
    expect(
      payload.data.classes.some(
        (item) => item.class === "provider_rate_limited" && item.status === "dead_letter" && item.count === 1
      )
    ).toBe(true);
    expect(
      payload.data.classes.some(
        (item) => item.class === "provider_unavailable" && item.status === "failed" && item.count === 1
      )
    ).toBe(true);
    expect(
      payload.data.replayCandidates.some(
        (item) => item.jobId === deadLetter.id && item.replayEndpoint.endsWith(`/jobs/${deadLetter.id}/replay`)
      )
    ).toBe(true);
  });
});
