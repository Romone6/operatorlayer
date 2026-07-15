import type { OperatorRepository } from "@/lib/repository/interface";
import type { JobType, ProcessingJob } from "@/lib/types";

export async function enqueueJobWithIdempotency(
  repository: OperatorRepository,
  input: {
    organisationId: string;
    jobType: JobType;
    payload: Record<string, unknown>;
    sourceId?: string | null;
    idempotencyKey?: string;
  }
): Promise<ProcessingJob> {
  if (!input.idempotencyKey) {
    return repository.enqueueJob({
      organisationId: input.organisationId,
      jobType: input.jobType,
      payload: input.payload,
      sourceId: input.sourceId ?? null,
    });
  }

  const existing = (await repository.listJobs(input.organisationId)).find((job) => {
    const key = job.payload?.idempotencyKey;
    return (
      job.jobType === input.jobType &&
      typeof key === "string" &&
      key === input.idempotencyKey &&
      ["queued", "running", "succeeded"].includes(job.status)
    );
  });
  if (existing) return existing;

  return repository.enqueueJob({
    organisationId: input.organisationId,
    jobType: input.jobType,
    payload: {
      ...input.payload,
      idempotencyKey: input.idempotencyKey,
    },
    sourceId: input.sourceId ?? null,
  });
}
