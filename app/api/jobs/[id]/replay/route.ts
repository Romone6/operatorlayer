import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    const { id } = await params;
    const repository = getRepository();
    const jobs = await repository.listJobs(context.organisationId);
    const job = jobs.find((item) => item.id === id);
    if (!job) throw new AppError(404, "job_not_found", "Job not found.");
    if (!["failed", "dead_letter"].includes(job.status)) {
      throw new AppError(400, "job_not_replayable", "Only failed or dead-letter jobs can be replayed.");
    }
    const replayed = await repository.updateJob({
      jobId: id,
      organisationId: context.organisationId,
      status: "queued",
      errorMessage: null,
      payloadPatch: {
        replayedAt: new Date().toISOString(),
      },
    });
    return jsonOk(replayed);
  } catch (error) {
    return jsonError(error);
  }
}
