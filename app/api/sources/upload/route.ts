import { NextRequest } from "next/server";

import { getRequestContext } from "@/lib/auth/context";
import { assertRole } from "@/lib/auth/authorization";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { extractTextFromSource, type SupportedSourceType } from "@/lib/parsers";
import { getRepository } from "@/lib/repository";
import { resolveRequestIdempotencyKey } from "@/lib/services/idempotency";
import { enqueueJobWithIdempotency } from "@/lib/services/job-queue";
import { runNextQueuedJob } from "@/lib/services/jobs";
import { uploadSourceFile } from "@/lib/storage";
import { sourceUploadSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  let createdSourceId: string | null = null;
  let organisationId: string | null = null;
  const repository = getRepository();

  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    organisationId = context.organisationId;
    const formData = await request.formData();
    const file = formData.get("file");
    const sourceType = String(formData.get("sourceType") ?? "");
    const title = String(formData.get("title") ?? "");
    const authorityLevel = String(formData.get("authorityLevel") ?? "");
    const pastedText = String(formData.get("pastedText") ?? "");

    sourceUploadSchema.parse({ title, sourceType, authorityLevel, pastedText: pastedText || undefined });
    let fileUrl: string | undefined;
    let rawText = "";

    if (sourceType === "pasted_text") {
      rawText = await extractTextFromSource("pasted_text", { text: pastedText });
    } else {
      if (!(file instanceof File)) {
        throw new AppError(400, "missing_file", "A file is required for this source type.");
      }
      const createdSource = await repository.createSource({
        organisationId: context.organisationId,
        title,
        sourceType,
        authorityLevel,
        metadata: { uploadedAt: new Date().toISOString() },
      });
      createdSourceId = createdSource.id;
      const buffer = Buffer.from(await file.arrayBuffer());
      rawText = await extractTextFromSource(sourceType as SupportedSourceType, { buffer });
      const upload = await uploadSourceFile({
        organisationId: context.organisationId,
        sourceId: createdSource.id,
        sourceType,
        fileName: file.name,
        data: buffer,
      });
      fileUrl = upload.fileUrl;

      const source = await repository.updateSourceStatus({
        sourceId: createdSource.id,
        organisationId: context.organisationId,
        status: "uploaded",
        rawText,
        metadata: { fileName: file.name, fileSize: file.size, fileUrl },
      });
      await enqueueJobWithIdempotency(repository, {
        organisationId: context.organisationId,
        sourceId: source.id,
        jobType: "source_extraction",
        payload: { sourceId: source.id },
        idempotencyKey: resolveRequestIdempotencyKey(request, "source_upload_extraction", {
          sourceId: source.id,
          sourceType,
        }),
      });
      await repository.createIngestionLog({
        organisationId: context.organisationId,
        sourceId: source.id,
        action: "source_uploaded",
        details: {
          sourceType,
          title,
          authorityLevel,
          fileName: file.name,
        },
      });
      if (process.env.OPERATORLAYER_INLINE_JOB_RUNNER === "1") {
        await runNextQueuedJob(repository, context.organisationId);
      }
      return jsonOk(source, 201);
    }

    const source = await repository.createSource({
      organisationId: context.organisationId,
      title,
      sourceType,
      authorityLevel,
      fileUrl,
      rawText,
      metadata: { uploadedAt: new Date().toISOString() },
    });
    createdSourceId = source.id;

    await enqueueJobWithIdempotency(repository, {
      organisationId: context.organisationId,
      sourceId: source.id,
      jobType: "source_extraction",
      payload: { sourceId: source.id },
      idempotencyKey: resolveRequestIdempotencyKey(request, "source_upload_extraction", {
        sourceId: source.id,
        sourceType: "pasted_text",
      }),
    });
    await repository.createIngestionLog({
      organisationId: context.organisationId,
      sourceId: source.id,
      action: "source_uploaded",
      details: {
        sourceType,
        title,
        authorityLevel,
        mode: "pasted_text",
      },
    });
    if (process.env.OPERATORLAYER_INLINE_JOB_RUNNER === "1") {
      await runNextQueuedJob(repository, context.organisationId);
    }
    return jsonOk(source, 201);
  } catch (error) {
    if (createdSourceId && organisationId) {
      await repository
        .createIngestionLog({
          organisationId,
          sourceId: createdSourceId,
          action: "source_upload_failed",
          details: {
            error: error instanceof Error ? error.message : "unknown",
          },
        })
        .catch(() => undefined);
      await repository
        .updateSourceStatus({
          sourceId: createdSourceId,
          organisationId,
          status: "failed",
          metadata: { failedAt: new Date().toISOString(), error: error instanceof Error ? error.message : "unknown" },
        })
        .catch(() => undefined);
    }
    return jsonError(error);
  }
}
