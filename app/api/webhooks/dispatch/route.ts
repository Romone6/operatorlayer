import { NextRequest } from "next/server";
import { z } from "zod";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { resolveWebhookSubscriptions } from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { resolveRequestIdempotencyKey } from "@/lib/services/idempotency";
import { enqueueJobWithIdempotency } from "@/lib/services/job-queue";
import { isWebhookEventSubscribed } from "@/lib/services/webhook-subscriptions";

const dispatchSchema = z.object({
  eventType: z.string().min(3),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "api-admin");
    const body = dispatchSchema.parse(await request.json());
    const repository = getRepository();
    const webhooks = await resolveWebhookSubscriptions(repository, context.organisationId);
    const active = webhooks
      .filter((item) => item.status === "active")
      .filter((item) => isWebhookEventSubscribed(item.events, body.eventType));
    const requestKey = resolveRequestIdempotencyKey(request, "webhook_dispatch", {
      organisationId: context.organisationId,
      eventType: body.eventType,
      payload: body.payload,
    });
    const queued = [];
    for (const webhook of active) {
      const job = await enqueueJobWithIdempotency(repository, {
        organisationId: context.organisationId,
        jobType: "webhook_delivery",
        payload: {
          webhookId: webhook.id,
          eventType: body.eventType,
          payload: body.payload,
        },
        idempotencyKey: `${requestKey}:${webhook.id}`,
      });
      queued.push(job.id);
    }
    return jsonOk({
      eventType: body.eventType,
      queuedJobs: queued,
      queuedCount: queued.length,
    });
  } catch (error) {
    return jsonError(error);
  }
}
