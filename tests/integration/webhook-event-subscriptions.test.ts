import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createOrganisation } from "@/app/api/organisations/route";
import { POST as createWebhook } from "@/app/api/webhooks/route";
import { POST as dispatchWebhook } from "@/app/api/webhooks/dispatch/route";
import { GET as listJobs } from "@/app/api/jobs/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "test-user-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

async function createOrg() {
  const request = new NextRequest("http://localhost/api/organisations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": "test-user-001",
    },
    body: JSON.stringify({ name: "Webhook Subscription Org", industry: "SaaS" }),
  });
  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("webhook event subscriptions", () => {
  beforeEach(() => {
    resetMemoryRepository();
    process.env.OPERATORLAYER_SECRET_ENCRYPTION_KEY = "test-secret-encryption-key";
  });

  it("queues webhook delivery jobs only for matching subscriptions", async () => {
    const orgId = await createOrg();

    const evaluationHook = await createWebhook(
      authedRequest("http://localhost/api/webhooks", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "https://example.com/hooks/evaluation",
          events: ["evaluation.created"],
        }),
      })
    );
    expect(evaluationHook.status).toBe(201);
    const evaluationPayload = (await evaluationHook.json()) as { data: { webhook: { id: string } } };

    const sendEventWildcardHook = await createWebhook(
      authedRequest("http://localhost/api/webhooks", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "https://example.com/hooks/send-event",
          events: ["send_event.*"],
        }),
      })
    );
    expect(sendEventWildcardHook.status).toBe(201);
    const sendEventWildcardPayload = (await sendEventWildcardHook.json()) as {
      data: { webhook: { id: string } };
    };

    const globalHook = await createWebhook(
      authedRequest("http://localhost/api/webhooks", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "https://example.com/hooks/all",
          events: ["*"],
        }),
      })
    );
    expect(globalHook.status).toBe(201);
    const globalPayload = (await globalHook.json()) as { data: { webhook: { id: string } } };

    const dispatchEvaluation = await dispatchWebhook(
      authedRequest("http://localhost/api/webhooks/dispatch", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json", "idempotency-key": "dispatch-evaluation-001" },
        body: JSON.stringify({
          eventType: "evaluation.created",
          payload: { id: "eval-001" },
        }),
      })
    );
    expect(dispatchEvaluation.status).toBe(200);
    const dispatchEvaluationPayload = (await dispatchEvaluation.json()) as {
      data: { queuedJobs: string[] };
    };
    expect(dispatchEvaluationPayload.data.queuedJobs).toHaveLength(2);

    const dispatchSendEvent = await dispatchWebhook(
      authedRequest("http://localhost/api/webhooks/dispatch", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json", "idempotency-key": "dispatch-send-event-001" },
        body: JSON.stringify({
          eventType: "send_event.created",
          payload: { id: "send-001" },
        }),
      })
    );
    expect(dispatchSendEvent.status).toBe(200);
    const dispatchSendEventPayload = (await dispatchSendEvent.json()) as {
      data: { queuedJobs: string[] };
    };
    expect(dispatchSendEventPayload.data.queuedJobs).toHaveLength(2);

    const jobsResponse = await listJobs(authedRequest("http://localhost/api/jobs", orgId));
    expect(jobsResponse.status).toBe(200);
    const jobsPayload = (await jobsResponse.json()) as {
      data: Array<{ id: string; payload: { webhookId?: string }; jobType: string }>;
    };

    const evaluationDispatchWebhookIds = jobsPayload.data
      .filter((job) => dispatchEvaluationPayload.data.queuedJobs.includes(job.id))
      .map((job) => String(job.payload.webhookId ?? ""));
    expect(new Set(evaluationDispatchWebhookIds)).toEqual(
      new Set([evaluationPayload.data.webhook.id, globalPayload.data.webhook.id])
    );

    const sendEventDispatchWebhookIds = jobsPayload.data
      .filter((job) => dispatchSendEventPayload.data.queuedJobs.includes(job.id))
      .map((job) => String(job.payload.webhookId ?? ""));
    expect(new Set(sendEventDispatchWebhookIds)).toEqual(
      new Set([sendEventWildcardPayload.data.webhook.id, globalPayload.data.webhook.id])
    );
  });
});
