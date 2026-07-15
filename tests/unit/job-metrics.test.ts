import { describe, expect, it } from "vitest";

import { buildJobMetrics } from "@/lib/enterprise/job-metrics";
import type { ProcessingJob } from "@/lib/types";

function makeJob(overrides: Partial<ProcessingJob>): ProcessingJob {
  const base: ProcessingJob = {
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
  };
  return { ...base, ...overrides };
}

describe("buildJobMetrics", () => {
  it("computes queue latency, retries, terminal failure classes, and provider error rates", () => {
    const nowMs = Date.parse("2026-05-18T12:00:00.000Z");
    const jobs: ProcessingJob[] = [
      makeJob({
        id: "queued-a",
        status: "queued",
        createdAt: "2026-05-18T11:50:00.000Z",
        updatedAt: "2026-05-18T11:50:00.000Z",
      }),
      makeJob({
        id: "gmail-ok",
        status: "succeeded",
        attempts: 1,
        payload: {
          provider: "gmail",
          firstStartedAt: "2026-05-18T11:42:00.000Z",
        },
        createdAt: "2026-05-18T11:40:00.000Z",
        updatedAt: "2026-05-18T11:45:00.000Z",
      }),
      makeJob({
        id: "gmail-dead",
        status: "dead_letter",
        attempts: 2,
        payload: {
          provider: "gmail",
          firstStartedAt: "2026-05-18T11:35:00.000Z",
          lastErrorCode: "provider_rate_limited",
          terminalFailureClass: "provider_rate_limited",
        },
        errorMessage: "Provider rate limited",
        createdAt: "2026-05-18T11:30:00.000Z",
        updatedAt: "2026-05-18T11:36:00.000Z",
      }),
      makeJob({
        id: "slack-failed",
        status: "failed",
        attempts: 1,
        payload: {
          provider: "slack",
          firstStartedAt: "2026-05-18T11:53:00.000Z",
          lastErrorCode: "connector_token_missing",
        },
        errorMessage: "Connector token missing",
        createdAt: "2026-05-18T11:52:00.000Z",
        updatedAt: "2026-05-18T11:54:00.000Z",
      }),
      makeJob({
        id: "slack-ok-retry",
        status: "succeeded",
        attempts: 2,
        payload: {
          provider: "slack",
          firstStartedAt: "2026-05-18T11:56:00.000Z",
        },
        createdAt: "2026-05-18T11:55:00.000Z",
        updatedAt: "2026-05-18T11:57:00.000Z",
      }),
      makeJob({
        id: "out-of-window",
        status: "dead_letter",
        attempts: 3,
        payload: {
          provider: "zendesk",
          firstStartedAt: "2026-05-16T07:00:00.000Z",
          terminalFailureClass: "provider_timeout",
        },
        createdAt: "2026-05-16T06:00:00.000Z",
        updatedAt: "2026-05-16T08:00:00.000Z",
      }),
    ];

    const metrics = buildJobMetrics({
      jobs,
      nowMs,
      windowHours: 24,
    });

    expect(metrics.window.windowHours).toBe(24);
    expect(metrics.queueDepth).toEqual({
      queued: 1,
      running: 0,
      succeeded: 2,
      failed: 1,
      dead_letter: 1,
    });
    expect(metrics.enqueueLatency.sampleSize).toBe(5);
    expect(metrics.executionLatency.sampleSize).toBe(4);
    expect(metrics.retries.totalRetries).toBe(2);
    expect(metrics.retries.jobsWithRetries).toBe(2);
    expect(metrics.retries.byJobType.connector_sync).toBe(2);
    expect(metrics.terminalFailures.total).toBe(2);
    expect(
      metrics.terminalFailures.classes.find((item) => item.class === "provider_rate_limited")?.count
    ).toBe(1);
    expect(
      metrics.terminalFailures.classes.find((item) => item.class === "connector_token_missing")?.count
    ).toBe(1);
    expect(metrics.providerErrorRates.find((item) => item.provider === "gmail")).toEqual({
      provider: "gmail",
      totalSyncJobs: 2,
      failedSyncJobs: 1,
      errorRatePct: 50,
    });
    expect(metrics.providerErrorRates.find((item) => item.provider === "zendesk")).toEqual({
      provider: "zendesk",
      totalSyncJobs: 0,
      failedSyncJobs: 0,
      errorRatePct: null,
    });
  });
});
