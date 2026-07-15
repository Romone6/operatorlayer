import type { OperatorRepository } from "@/lib/repository/interface";

export async function ensureInviteDeliveryJob(
  repository: OperatorRepository,
  organisationId: string,
  inviteId: string,
  reason: string
) {
  const existing = await repository.listJobs(organisationId);
  const active = existing.find(
    (job) =>
      job.jobType === "invite_delivery" &&
      (job.status === "queued" || job.status === "running") &&
      String(job.payload.inviteId ?? "") === inviteId
  );
  if (active) {
    return active;
  }

  return repository.enqueueJob({
    organisationId,
    jobType: "invite_delivery",
    payload: {
      inviteId,
      reason,
    },
  });
}

