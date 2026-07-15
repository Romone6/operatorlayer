import { NextRequest } from "next/server";

import { getRequestContext } from "@/lib/auth/context";
import { assertRole } from "@/lib/auth/authorization";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { resolveRequestIdempotencyKey } from "@/lib/services/idempotency";
import { enqueueJobWithIdempotency } from "@/lib/services/job-queue";
import { runNextQueuedJob } from "@/lib/services/jobs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const repository = getRepository();
  let sourceId: string | null = null;
  let organisationId: string | null = null;
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    organisationId = context.organisationId;
    const { id } = await params;
    sourceId = id;
    const source = await repository.getSourceById(context.organisationId, id);
    if (!source) {
      throw new AppError(404, "source_not_found", "Source was not found.");
    }
    if (!source.rawText) {
      throw new AppError(400, "source_raw_text_missing", "Source has no extracted text to process.");
    }
    const job = await enqueueJobWithIdempotency(repository, {
      organisationId: context.organisationId,
      sourceId: source.id,
      jobType: "source_extraction",
      payload: { sourceId: source.id },
      idempotencyKey: resolveRequestIdempotencyKey(request, "source_reprocess", {
        sourceId: source.id,
        mode: "manual_reprocess",
      }),
    });
    await repository.createIngestionLog({
      organisationId: context.organisationId,
      sourceId: source.id,
      action: "source_reprocess_requested",
      details: { sourceId: source.id, mode: "manual" },
    });
    if (process.env.OPERATORLAYER_INLINE_JOB_RUNNER === "1") {
      await runNextQueuedJob(repository, context.organisationId);
    }
    return jsonOk({ sourceId: id, status: "queued", jobId: job.id });
  } catch (error) {
    if (sourceId && organisationId) {
      await repository
        .createIngestionLog({
          organisationId,
          sourceId,
          action: "source_reprocess_failed",
          details: { error: error instanceof Error ? error.message : "unknown" },
        })
        .catch(() => undefined);
      await repository
        .updateSourceStatus({
          sourceId,
          organisationId,
          status: "failed",
          metadata: { failedAt: new Date().toISOString(), error: error instanceof Error ? error.message : "unknown" },
        })
        .catch(() => undefined);
    }
    return jsonError(error);
  }
}

