import type { JobStatus, JobType, ProcessingJob } from "@/lib/types";

type FailureStatus = Extract<JobStatus, "failed" | "dead_letter">;

type FailureClassEntry = {
  class: string;
  status: FailureStatus;
  count: number;
  lastSeenAt: string;
  jobTypes: JobType[];
  providers: string[];
};

type ReplayCandidate = {
  jobId: string;
  status: FailureStatus;
  jobType: JobType;
  provider: string | null;
  failureClass: string;
  errorMessage: string | null;
  attempts: number;
  nextAttemptAt: string | null;
  replayEndpoint: string;
  updatedAt: string;
};

export type JobFailureTaxonomy = {
  generatedAt: string;
  window: {
    from: string | null;
    to: string;
    windowHours: number | null;
  };
  totals: {
    failed: number;
    deadLetter: number;
    replayable: number;
  };
  classes: FailureClassEntry[];
  replayCandidates: ReplayCandidate[];
};

function parseMs(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function classify(job: ProcessingJob) {
  const terminal = job.payload.terminalFailureClass;
  if (typeof terminal === "string" && terminal.trim().length > 0) return terminal.trim();
  const lastErrorCode = job.payload.lastErrorCode;
  if (typeof lastErrorCode === "string" && lastErrorCode.trim().length > 0) return lastErrorCode.trim();
  return "unknown";
}

function inWindow(job: ProcessingJob, fromMs: number | null) {
  if (fromMs === null) return true;
  const updatedMs = parseMs(job.updatedAt);
  if (updatedMs === null) return false;
  return updatedMs >= fromMs;
}

function toProvider(job: ProcessingJob) {
  const provider = job.payload.provider;
  if (typeof provider === "string" && provider.trim().length > 0) return provider.trim();
  return null;
}

export function buildJobFailureTaxonomy(input: {
  jobs: ProcessingJob[];
  organisationId: string;
  nowMs?: number;
  windowHours?: number | null;
}): JobFailureTaxonomy {
  const nowMs = input.nowMs ?? Date.now();
  const windowHours = input.windowHours ?? null;
  const windowFromMs = windowHours === null ? null : nowMs - windowHours * 60 * 60 * 1000;

  const failedJobs = input.jobs
    .filter((job) => (job.status === "failed" || job.status === "dead_letter") && inWindow(job, windowFromMs))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const classMap = new Map<string, { count: number; lastSeenAt: string; jobTypes: Set<JobType>; providers: Set<string> }>();
  for (const job of failedJobs) {
    const key = `${job.status}:${classify(job)}`;
    const existing = classMap.get(key) ?? {
      count: 0,
      lastSeenAt: job.updatedAt,
      jobTypes: new Set<JobType>(),
      providers: new Set<string>(),
    };
    existing.count += 1;
    if (job.updatedAt > existing.lastSeenAt) existing.lastSeenAt = job.updatedAt;
    existing.jobTypes.add(job.jobType);
    const provider = toProvider(job);
    if (provider) existing.providers.add(provider);
    classMap.set(key, existing);
  }

  const classes: FailureClassEntry[] = Array.from(classMap.entries())
    .map(([key, value]) => {
      const [status, ...classParts] = key.split(":");
      return {
        class: classParts.join(":"),
        status: status as FailureStatus,
        count: value.count,
        lastSeenAt: value.lastSeenAt,
        jobTypes: Array.from(value.jobTypes).sort(),
        providers: Array.from(value.providers).sort(),
      };
    })
    .sort((a, b) => b.count - a.count || b.lastSeenAt.localeCompare(a.lastSeenAt));

  const replayCandidates: ReplayCandidate[] = failedJobs.map((job) => ({
    jobId: job.id,
    status: job.status as FailureStatus,
    jobType: job.jobType,
    provider: toProvider(job),
    failureClass: classify(job),
    errorMessage: job.errorMessage,
    attempts: job.attempts,
    nextAttemptAt: typeof job.payload.nextAttemptAt === "string" ? job.payload.nextAttemptAt : null,
    replayEndpoint: `/api/jobs/${job.id}/replay`,
    updatedAt: job.updatedAt,
  }));

  return {
    generatedAt: new Date(nowMs).toISOString(),
    window: {
      from: windowFromMs === null ? null : new Date(windowFromMs).toISOString(),
      to: new Date(nowMs).toISOString(),
      windowHours,
    },
    totals: {
      failed: failedJobs.filter((job) => job.status === "failed").length,
      deadLetter: failedJobs.filter((job) => job.status === "dead_letter").length,
      replayable: failedJobs.length,
    },
    classes,
    replayCandidates,
  };
}
