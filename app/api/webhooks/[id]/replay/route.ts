import { NextRequest } from "next/server";
import { z } from "zod";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { resolveWebhookSubscriptions } from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { resolveRequestIdempotencyKey } from "@/lib/services/idempotency";
import { enqueueJobWithIdempotency } from "@/lib/services/job-queue";
import { isWebhookEventSubscribed } from "@/lib/services/webhook-subscriptions";

const replaySchema = z.object({
  jobId: z.string().uuid().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "api-admin");
    const repository = getRepository();
    const { id } = await params;

    const webhooks = await resolveWebhookSubscriptions(repository, context.organisationId);
    if (!webhooks.some((item) => item.id === id)) {
      throw new AppError(404, "webhook_not_found", "Webhook subscription not found.");
    }

    const jobs = await repository.listJobs(context.organisationId);
    const replayable = jobs
      .filter((job) => job.jobType === "webhook_delivery")
      .filter((job) => String(job.payload.webhookId ?? "") === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((job) => ({
        jobId: job.id,
        status: job.status,
        attempts: job.attempts,
        eventType: String(job.payload.eventType ?? "unknown"),
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        errorMessage: job.errorMessage,
      }));

    return jsonOk({
      webhookId: id,
      replayable,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "api-admin");
    const repository = getRepository();
    const { id } = await params;

    const webhooks = await resolveWebhookSubscriptions(repository, context.organisationId);
    const target = webhooks.find((item) => item.id === id);
    if (!target) {
      throw new AppError(404, "webhook_not_found", "Webhook subscription not found.");
    }
    if (target.status !== "active") {
      throw new AppError(409, "webhook_not_active", "Webhook subscription is not active.");
    }

    const body = replaySchema.parse(await request.json().catch(() => ({})));
    const jobs = await repository.listJobs(context.organisationId);
    const candidates = jobs
      .filter((job) => job.jobType === "webhook_delivery")
      .filter((job) => String(job.payload.webhookId ?? "") === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const selected = body.jobId ? candidates.find((item) => item.id === body.jobId) : candidates[0];
    if (!selected) {
      throw new AppError(404, "webhook_replay_source_not_found", "No webhook delivery job available to replay.");
    }

    const eventType = String(selected.payload.eventType ?? "");
    if (!eventType) {
      throw new AppError(400, "webhook_replay_invalid_source", "Selected webhook job has no event type.");
    }
    if (!isWebhookEventSubscribed(target.events, eventType)) {
      throw new AppError(
        409,
        "webhook_event_not_subscribed",
        "Webhook subscription does not include this event type."
      );
    }

    const replayJob = await enqueueJobWithIdempotency(repository, {
      organisationId: context.organisationId,
      jobType: "webhook_delivery",
      payload: {
        webhookId: id,
        eventType,
        payload: selected.payload.payload ?? {},
        replayOfJobId: selected.id,
      },
      idempotencyKey: resolveRequestIdempotencyKey(request, "webhook_replay", {
        organisationId: context.organisationId,
        webhookId: id,
        replayOfJobId: selected.id,
        eventType,
      }),
    });

    await repository.createIngestionLog({
      organisationId: context.organisationId,
      sourceId: null,
      action: "enterprise:webhook_replay_enqueued",
      details: {
        webhookId: id,
        replayOfJobId: selected.id,
        replayJobId: replayJob.id,
        eventType,
        actorId: context.userId,
      },
    });

    return jsonOk({
      webhookId: id,
      replayOfJobId: selected.id,
      replayJobId: replayJob.id,
      status: "queued",
    });
  } catch (error) {
    return jsonError(error);
  }
}
