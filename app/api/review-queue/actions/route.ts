import { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestContext } from "@/lib/auth/context";
import { assertRole } from "@/lib/auth/authorization";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import type { ReviewEntityType } from "@/lib/repository/interface";
import { resolveRequestIdempotencyKey } from "@/lib/services/idempotency";
import { enqueueJobWithIdempotency } from "@/lib/services/job-queue";
import { reviewActionSchema } from "@/lib/validation";

async function applyEntityAction(
  organisationId: string,
  reviewerId: string,
  itemType: ReviewEntityType,
  itemId: string,
  action: "approve" | "edit" | "reject" | "mark_outdated",
  payload: Record<string, unknown> | undefined
) {
  const repository = getRepository();
  const reviewedAt = new Date().toISOString();

  if (itemType === "policy") {
    if (action === "approve") {
      return repository.patchPolicy(organisationId, itemId, {
        status: "approved",
        reviewedBy: reviewerId,
        reviewedAt,
      });
    }
    if (action === "reject") {
      return repository.patchPolicy(organisationId, itemId, {
        status: "rejected",
        reviewedBy: reviewerId,
        reviewedAt,
      });
    }
    if (action === "mark_outdated") {
      return repository.patchPolicy(organisationId, itemId, {
        status: "outdated",
        reviewedBy: reviewerId,
        reviewedAt,
      });
    }
    return repository.patchPolicy(organisationId, itemId, {
      name: typeof payload?.name === "string" ? payload.name : undefined,
      description: typeof payload?.description === "string" ? payload.description : undefined,
      reviewedBy: reviewerId,
      reviewedAt,
    });
  }

  if (itemType === "terminology") {
    if (action === "approve") {
      return repository.patchTerminology(organisationId, itemId, {
        status: "approved",
        reviewedBy: reviewerId,
        reviewedAt,
      });
    }
    if (action === "reject") {
      return repository.patchTerminology(organisationId, itemId, {
        status: "rejected",
        reviewedBy: reviewerId,
        reviewedAt,
      });
    }
    if (action === "mark_outdated") {
      return repository.patchTerminology(organisationId, itemId, {
        status: "outdated",
        reviewedBy: reviewerId,
        reviewedAt,
      });
    }
    return repository.patchTerminology(organisationId, itemId, {
      recommendation:
        typeof payload?.recommendation === "string" ? payload.recommendation : undefined,
      reviewedBy: reviewerId,
      reviewedAt,
    });
  }

  if (action === "approve") {
    return repository.patchConflict(organisationId, itemId, {
      status: "approved",
      reviewedBy: reviewerId,
      reviewedAt,
    });
  }
  if (action === "reject") {
    return repository.patchConflict(organisationId, itemId, {
      status: "rejected",
      reviewedBy: reviewerId,
      reviewedAt,
    });
  }
  if (action === "mark_outdated") {
    return repository.patchConflict(organisationId, itemId, {
      status: "outdated",
      reviewedBy: reviewerId,
      reviewedAt,
    });
  }
  return repository.patchConflict(organisationId, itemId, {
    recommendedResolution:
      typeof payload?.recommendedResolution === "string"
        ? payload.recommendedResolution
        : undefined,
    reviewedBy: reviewerId,
    reviewedAt,
  });
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin", "reviewer"]);
    const body = reviewActionSchema.parse(await request.json());
    const repository = getRepository();

    if (body.action === "request_reprocessing") {
      const sourceId = typeof body.payload?.sourceId === "string" ? body.payload.sourceId : null;
      const job = await enqueueJobWithIdempotency(repository, {
        organisationId: context.organisationId,
        sourceId,
        jobType: "source_extraction",
        payload: sourceId ? { sourceId } : {},
        idempotencyKey: resolveRequestIdempotencyKey(request, "review_request_reprocessing", {
          itemType: body.itemType,
          itemId: body.itemId,
          sourceId: sourceId ?? "none",
        }),
      });
      await repository.createReviewEvent({
        organisationId: context.organisationId,
        itemType: body.itemType,
        itemId: body.itemId,
        action: body.action,
        actorId: context.userId,
        beforeState: { sourceId: sourceId ?? null },
        afterState: { queued: true, sourceId: sourceId ?? null },
      });
      return jsonOk({ queued: true, jobId: job.id });
    }

    const queueBefore = await repository.listReviewQueue(context.organisationId);
    const beforeItem =
      queueBefore.sections
        .flatMap((section) => section.items)
        .find((item) => item.id === body.itemId && item.entityType === body.itemType) ?? null;

    const updated = await applyEntityAction(
      context.organisationId,
      context.userId,
      body.itemType,
      body.itemId,
      body.action,
      body.payload
    );

    if (!updated) {
      throw new AppError(404, "review_item_not_found", "Review item was not found.");
    }

    const queue = await repository.listReviewQueue(context.organisationId);
    const afterItem =
      queue.sections
        .flatMap((section) => section.items)
        .find((item) => item.id === body.itemId && item.entityType === body.itemType) ?? null;
    await repository.createReviewEvent({
      organisationId: context.organisationId,
      itemType: body.itemType,
      itemId: body.itemId,
      action: body.action,
      actorId: context.userId,
      beforeState: beforeItem ?? {},
      afterState: afterItem ?? { removedFromQueue: true },
    });
    return jsonOk({
      updated,
      queueSummary: queue.summary,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(new AppError(400, "invalid_payload", "Invalid payload", error.flatten()));
    }
    return jsonError(error);
  }
}
