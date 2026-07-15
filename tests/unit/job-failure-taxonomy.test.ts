import { describe, expect, it } from "vitest";

import { buildJobFailureTaxonomy } from "@/lib/enterprise/job-failure-taxonomy";
import type { ProcessingJob } from "@/lib/types";

function makeJob(overrides: Partial<ProcessingJob>): ProcessingJob {
  return {
    id: "job-1",
    organisationId: "org-1",
    sourceId: null,
    jobType: "connector_sync",
    status: "queued",
    attempts: 0,
    payload: {},
    errorMessage: null,
    createdAt: "2026-05-18T00:00:00.000Z",
    updatedAt: "2026-05-18T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildJobFailureTaxonomy", () => {
  it("builds class taxonomy and replay candidates for failed and dead-letter jobs", () => {
    const nowMs = Date.parse("2026-05-18T12:00:00.000Z");
    const jobs: ProcessingJob[] = [
      makeJob({
        id: "job-failed",
        status: "failed",
        attempts: 1,
        payload: { provider: "gmail", lastErrorCode: "provider_unavailable" },
        updatedAt: "2026-05-18T11:30:00.000Z",
      }),
      makeJob({
        id: "job-dead",
        status: "dead_letter",
        attempts: 2,
        payload: {
          provider: "slack",
          lastErrorCode: "provider_rate_limited",
          terminalFailureClass: "provider_rate_limited",
        },
        updatedAt: "2026-05-18T11:40:00.000Z",
      }),
      makeJob({
        id: "job-ok",
        status: "succeeded",
        attempts: 1,
        updatedAt: "2026-05-18T11:45:00.000Z",
      }),
    ];

    const result = buildJobFailureTaxonomy({
      jobs,
      organisationId: "org-1",
      nowMs,
      windowHours: 24,
    });

    expect(result.totals).toEqual({ failed: 1, deadLetter: 1, replayable: 2 });
    expect(result.classes.some((entry) => entry.class === "provider_unavailable")).toBe(true);
    expect(result.classes.some((entry) => entry.class === "provider_rate_limited")).toBe(true);
    expect(result.replayCandidates).toHaveLength(2);
    expect(result.replayCandidates[0].replayEndpoint).toContain("/api/jobs/");
  });
});
