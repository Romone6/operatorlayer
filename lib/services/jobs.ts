import { AppError } from "@/lib/errors";
import type { OperatorRepository } from "@/lib/repository/interface";
import { processSourceExtraction } from "@/lib/services/pipeline";
import { evaluateAndRepairDraft, generateExportPack } from "@/lib/services/playground";

export async function runNextQueuedJob(repository: OperatorRepository, organisationId: string) {
  const job = await repository.getNextQueuedJob(organisationId);
  if (!job) return { processed: false };

  await repository.updateJob({ jobId: job.id, organisationId, status: "running" });

  try {
    if (job.jobType === "source_extraction") {
      const sourceId = String(job.payload.sourceId ?? job.sourceId ?? "");
      if (!sourceId) throw new AppError(400, "job_payload_invalid", "source_extraction job requires sourceId.");
      const source = await repository.getSourceById(organisationId, sourceId);
      if (!source) throw new AppError(404, "source_not_found", "Source not found for extraction.");
      if (!source.rawText) throw new AppError(400, "source_raw_text_missing", "Source has no extracted text.");
      await processSourceExtraction(repository, source);
    } else if (job.jobType === "draft_evaluation") {
      await evaluateAndRepairDraft({
        repository,
        organisationId,
        inputMessage: String(job.payload.inputMessage ?? ""),
        channel: String(job.payload.channel ?? "email"),
        team: String(job.payload.team ?? "general"),
        customerType: String(job.payload.customerType ?? "standard"),
        context: typeof job.payload.context === "string" ? job.payload.context : undefined,
        draft: typeof job.payload.draft === "string" ? job.payload.draft : undefined,
      });
    } else if (job.jobType === "export_generation") {
      await generateExportPack(repository, organisationId);
    } else {
      throw new AppError(400, "job_type_unavailable", `${job.jobType} is not available in the upload-based MVP.`);
    }

    const completed = await repository.updateJob({ jobId: job.id, organisationId, status: "succeeded" });
    return { processed: true, job: completed };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected job failure";
    const code = error instanceof AppError ? error.code : "internal_error";
    await repository.updateJob({
      jobId: job.id,
      organisationId,
      status: job.attempts >= 1 ? "dead_letter" : "failed",
      errorMessage: message,
      payloadPatch: { lastErrorCode: code },
    });
    throw error;
  }
}
