import type { ConnectorProvider, JobStatus, JobType, ProcessingJob } from "@/lib/types";

type LatencySummary = {
  sampleSize: number;
  avgMs: number | null;
  p95Ms: number | null;
  maxMs: number | null;
};

type QueueDepth = Record<JobStatus, number>;

type RetrySummary = {
  totalRetries: number;
  jobsWithRetries: number;
  byJobType: Record<JobType, number>;
};

type TerminalFailureSummary = {
  total: number;
  classes: Array<{
    class: string;
    count: number;
    statuses: Array<Extract<JobStatus, "failed" | "dead_letter">>;
  }>;
};

type ProviderErrorRate = {
  provider: ConnectorProvider;
  totalSyncJobs: number;
  failedSyncJobs: number;
  errorRatePct: number | null;
};

export type JobMetrics = {
  generatedAt: string;
  window: {
    from: string | null;
    to: string;
    windowHours: number | null;
  };
  queueDepth: QueueDepth;
  enqueueLatency: LatencySummary;
  executionLatency: LatencySummary;
  retries: RetrySummary;
  terminalFailures: TerminalFailureSummary;
  providerErrorRates: ProviderErrorRate[];
};

const connectorProviders: ConnectorProvider[] = [
  "gmail",
  "slack",
  "outlook",
  "hubspot",
  "salesforce",
  "intercom",
  "zendesk",
];

function parseMs(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function percentile95(samples: number[]) {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(0.95 * sorted.length) - 1);
  return sorted[index];
}

function summarizeLatency(samples: number[]): LatencySummary {
  if (samples.length === 0) {
    return {
      sampleSize: 0,
      avgMs: null,
      p95Ms: null,
      maxMs: null,
    };
  }
  const total = samples.reduce((sum, value) => sum + value, 0);
  return {
    sampleSize: samples.length,
    avgMs: Math.round(total / samples.length),
    p95Ms: percentile95(samples),
    maxMs: Math.max(...samples),
  };
}

function ensureNonNegative(value: number) {
  return value < 0 ? 0 : value;
}

function classifyTerminalFailure(job: ProcessingJob) {
  const fromPayload = job.payload.terminalFailureClass;
  if (typeof fromPayload === "string" && fromPayload.trim().length > 0) {
    return fromPayload.trim();
  }
  const fromErrorCode = job.payload.lastErrorCode;
  if (typeof fromErrorCode === "string" && fromErrorCode.trim().length > 0) {
    return fromErrorCode.trim();
  }
  return "unknown";
}

function buildQueueDepth(jobs: ProcessingJob[]): QueueDepth {
  return {
    queued: jobs.filter((job) => job.status === "queued").length,
    running: jobs.filter((job) => job.status === "running").length,
    succeeded: jobs.filter((job) => job.status === "succeeded").length,
    failed: jobs.filter((job) => job.status === "failed").length,
    dead_letter: jobs.filter((job) => job.status === "dead_letter").length,
  };
}

function jobInWindow(job: ProcessingJob, windowFromMs: number | null) {
  if (windowFromMs === null) return true;
  const createdAtMs = parseMs(job.createdAt);
  if (createdAtMs === null) return false;
  return createdAtMs >= windowFromMs;
}

export function buildJobMetrics(input: {
  jobs: ProcessingJob[];
  nowMs?: number;
  windowHours?: number | null;
}): JobMetrics {
  const nowMs = input.nowMs ?? Date.now();
  const windowHours = input.windowHours ?? null;
  const windowFromMs = windowHours === null ? null : nowMs - windowHours * 60 * 60 * 1000;
  const jobs = input.jobs.filter((job) => jobInWindow(job, windowFromMs));

  const enqueueLatencySamples: number[] = [];
  const executionLatencySamples: number[] = [];
  const retriesByJobType = {
    source_extraction: 0,
    draft_evaluation: 0,
    export_generation: 0,
    invite_delivery: 0,
    connector_sync: 0,
    webhook_delivery: 0,
    auto_send: 0,
  } satisfies Record<JobType, number>;
  const failureClassCounts = new Map<
    string,
    { count: number; statuses: Set<Extract<JobStatus, "failed" | "dead_letter">> }
  >();

  let totalRetries = 0;
  let jobsWithRetries = 0;

  for (const job of jobs) {
    const createdAtMs = parseMs(job.createdAt);
    const updatedAtMs = parseMs(job.updatedAt);
    const firstStartedAtMs = parseMs(
      typeof job.payload.firstStartedAt === "string" ? job.payload.firstStartedAt : null
    );

    if (createdAtMs !== null) {
      if (firstStartedAtMs !== null) {
        enqueueLatencySamples.push(ensureNonNegative(firstStartedAtMs - createdAtMs));
      } else if (job.status === "queued") {
        enqueueLatencySamples.push(ensureNonNegative(nowMs - createdAtMs));
      }
    }

    if (firstStartedAtMs !== null) {
      if (job.status === "running") {
        executionLatencySamples.push(ensureNonNegative(nowMs - firstStartedAtMs));
      } else if (updatedAtMs !== null) {
        executionLatencySamples.push(ensureNonNegative(updatedAtMs - firstStartedAtMs));
      }
    } else if (createdAtMs !== null && updatedAtMs !== null && job.attempts > 0) {
      executionLatencySamples.push(ensureNonNegative(updatedAtMs - createdAtMs));
    }

    const retries = Math.max(0, job.attempts - 1);
    if (retries > 0) {
      totalRetries += retries;
      jobsWithRetries += 1;
      retriesByJobType[job.jobType] += retries;
    }

    if (job.status === "failed" || job.status === "dead_letter") {
      const failureClass = classifyTerminalFailure(job);
      const entry = failureClassCounts.get(failureClass) ?? {
        count: 0,
        statuses: new Set<Extract<JobStatus, "failed" | "dead_letter">>(),
      };
      entry.count += 1;
      entry.statuses.add(job.status);
      failureClassCounts.set(failureClass, entry);
    }
  }

  const terminalFailureClasses = Array.from(failureClassCounts.entries())
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .map(([failureClass, value]) => ({
      class: failureClass,
      count: value.count,
      statuses: Array.from(value.statuses).sort(),
    }));

  const providerErrorRates: ProviderErrorRate[] = connectorProviders.map((provider) => {
    const providerJobs = jobs.filter(
      (job) => job.jobType === "connector_sync" && String(job.payload.provider ?? "") === provider
    );
    const failedJobs = providerJobs.filter(
      (job) => job.status === "failed" || job.status === "dead_letter"
    );
    return {
      provider,
      totalSyncJobs: providerJobs.length,
      failedSyncJobs: failedJobs.length,
      errorRatePct:
        providerJobs.length === 0
          ? null
          : Number(((failedJobs.length / providerJobs.length) * 100).toFixed(2)),
    };
  });

  return {
    generatedAt: new Date(nowMs).toISOString(),
    window: {
      from: windowFromMs === null ? null : new Date(windowFromMs).toISOString(),
      to: new Date(nowMs).toISOString(),
      windowHours,
    },
    queueDepth: buildQueueDepth(jobs),
    enqueueLatency: summarizeLatency(enqueueLatencySamples),
    executionLatency: summarizeLatency(executionLatencySamples),
    retries: {
      totalRetries,
      jobsWithRetries,
      byJobType: retriesByJobType,
    },
    terminalFailures: {
      total: terminalFailureClasses.reduce((count, item) => count + item.count, 0),
      classes: terminalFailureClasses,
    },
    providerErrorRates,
  };
}
