import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { NextRequest } from "next/server";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "smoke-notification-owner-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  headers.set("x-user-email", "notification-owner@example.com");
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

function externalRuntimeRequest(orgId: string, rawKey: string, body: unknown) {
  return new NextRequest("http://localhost/api/v1/runtime/governance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ol-api-key": rawKey,
      "x-ol-org-id": orgId,
    },
    body: JSON.stringify(body),
  });
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = process.env.OPERATORLAYER_TEST_AUTH_BYPASS ?? "1";
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS ?? "1";
  process.env.OPERATORLAYER_DATA_BACKEND = process.env.OPERATORLAYER_DATA_BACKEND ?? "memory";
  process.env.OPERATORLAYER_INLINE_JOB_RUNNER = process.env.OPERATORLAYER_INLINE_JOB_RUNNER ?? "1";
  process.env.OPERATORLAYER_PROCESSING_MODE = process.env.OPERATORLAYER_PROCESSING_MODE ?? "deterministic";
  process.env.OPERATORLAYER_SECRET_ENCRYPTION_KEY =
    process.env.OPERATORLAYER_SECRET_ENCRYPTION_KEY ?? "test-secret-encryption-key";

  const deliveries: Array<{ headers: IncomingMessage["headers"]; body: string }> = [];
  let requestCount = 0;
  const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
    requestCount += 1;
    deliveries.push({ headers: request.headers, body: await readBody(request) });
    if (requestCount === 1) {
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ ok: false, retry: true }));
      return;
    }
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Failed to start local webhook receiver.");
  }
  const endpoint = `http://127.0.0.1:${address.port}/operatorlayer/runtime`;

  try {
    const { POST: createOrganisation } = await import("@/app/api/organisations/route");
    const { POST: uploadSource } = await import("@/app/api/sources/upload/route");
    const { POST: createExport } = await import("@/app/api/exports/route");
    const { POST: createWebhook } = await import("@/app/api/webhooks/route");
    const { POST: createAgentConfig } = await import("@/app/api/agent-configs/route");
    const { POST: createApiKey } = await import("@/app/api/api-keys/route");
    const { POST: runtimeGovernance } = await import("@/app/api/v1/runtime/governance/route");
    const { POST: runJobsWorker } = await import("@/app/api/jobs/worker/route");
    const { GET: listJobs } = await import("@/app/api/jobs/route");
    const { GET: listAuditEvents } = await import("@/app/api/audit/events/route");
    const { POST: replayWebhook } = await import("@/app/api/webhooks/[id]/replay/route");
    const { GET: listNotificationDestinations } = await import("@/app/api/notifications/destinations/route");
    const { resetMemoryRepository } = await import("@/lib/repository/memory");

    resetMemoryRepository();

    const create = await createOrganisation(
      new NextRequest("http://localhost/api/organisations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "smoke-notification-owner-001",
          "x-user-email": "notification-owner@example.com",
        },
        body: JSON.stringify({ name: "Notification Routing Smoke Org", industry: "SaaS" }),
      })
    );
    if (!create.ok) throw new Error("Failed to create notification smoke organisation.");
    const org = (await create.json()) as { data: { id: string } };
    const orgId = org.data.id;

    const form = new FormData();
    form.set("title", "Notification Runtime Smoke Manual");
    form.set("sourceType", "pasted_text");
    form.set("authorityLevel", "high");
    form.set(
      "pastedText",
      [
        "Pricing objection scenario. Required behaviour: acknowledge_concern, reference_customer_context, provide_policy_aligned_next_step.",
        "Approved phrase: Based on what you shared, a scoped pilot approach may make sense.",
        "Forbidden phrases: no risk at all, guaranteed discount, legal promise.",
        "Human review conditions: discounts, legal threats, refunds, and security claims.",
      ].join(" ")
    );
    const source = await uploadSource(
      authedRequest("http://localhost/api/sources/upload", orgId, { method: "POST", body: form })
    );
    if (!source.ok) throw new Error("Failed to upload notification smoke source.");

    const exportPack = await createExport(
      authedRequest("http://localhost/api/exports", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exportType: "full_pack" }),
      })
    );
    if (!exportPack.ok) throw new Error("Failed to create notification smoke export pack.");

    const webhook = await createWebhook(
      authedRequest("http://localhost/api/webhooks", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, events: ["runtime_governance.*"] }),
      })
    );
    if (!webhook.ok) throw new Error("Failed to create notification smoke webhook.");
    const webhookPayload = (await webhook.json()) as { data: { webhook: { id: string } } };

    const destinationStatus = await listNotificationDestinations(
      authedRequest("http://localhost/api/notifications/destinations", orgId)
    );
    if (!destinationStatus.ok) throw new Error("Notification destination status endpoint failed.");
    const destinationPayload = (await destinationStatus.json()) as {
      data: Array<{ destination: string; state: string; reason: string }>;
    };
    if (destinationPayload.data.find((item) => item.destination === "webhook")?.state !== "available") {
      throw new Error("Webhook destination was not marked available.");
    }
    if (destinationPayload.data.find((item) => item.destination === "slack")?.reason !== "provider_not_implemented") {
      throw new Error("Slack destination was not explicitly marked unavailable.");
    }

    const config = await createAgentConfig(
      authedRequest("http://localhost/api/agent-configs", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "support-agent",
          displayName: "Support Agent",
          channel: "email",
          useCase: "pricing_objection",
          customerSegment: "smb",
          governanceMode: "conditional_approval",
          scoreThreshold: 95,
          riskLevels: ["low"],
          notificationDestinations: ["dashboard", "webhook", "slack"],
          enabled: true,
        }),
      })
    );
    if (!config.ok) throw new Error("Failed to configure notification smoke agent.");

    const key = await createApiKey(
      authedRequest("http://localhost/api/api-keys", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Notification Smoke Key", scopes: ["runtime.invoke"] }),
      })
    );
    if (!key.ok) throw new Error("Failed to create notification smoke API key.");
    const keyPayload = (await key.json()) as { data: { rawKey: string } };

    const decision = await runtimeGovernance(
      externalRuntimeRequest(orgId, keyPayload.data.rawKey, {
        agentId: "support-agent",
        channel: "email",
        useCase: "pricing_objection",
        customerSegment: "smb",
        inputMessage: "Can you discount this?",
        draft: "We can definitely discount this. No risk at all.",
      })
    );
    if (!decision.ok) throw new Error("Runtime governance did not create notification route.");
    const decisionPayload = (await decision.json()) as {
      data: {
        notificationRouting: {
          state: string;
          destinations: Array<{ destination: string; state: string; jobId: string | null; reason: string }>;
        };
      };
    };
    const webhookRoute = decisionPayload.data.notificationRouting.destinations.find(
      (destination) => destination.destination === "webhook"
    );
    if (!webhookRoute?.jobId || webhookRoute.state !== "queued") {
      throw new Error("Runtime notification did not queue webhook delivery.");
    }
    if (
      decisionPayload.data.notificationRouting.destinations.find((destination) => destination.destination === "slack")
        ?.reason !== "provider_not_implemented"
    ) {
      throw new Error("Slack notification destination was not labeled unavailable.");
    }

    const failedWorker = await runJobsWorker(
      authedRequest("http://localhost/api/jobs/worker?max=1", orgId, { method: "POST" })
    );
    if (failedWorker.ok) throw new Error("First webhook worker attempt should fail against 500 receiver.");

    const jobsAfterFailure = await listJobs(authedRequest("http://localhost/api/jobs", orgId));
    if (!jobsAfterFailure.ok) throw new Error("Failed to list jobs after failed webhook delivery.");
    const failedJobsPayload = (await jobsAfterFailure.json()) as {
      data: Array<{ id: string; jobType: string; status: string; payload: { eventType?: string } }>;
    };
    const failedJob = failedJobsPayload.data.find(
      (job) => job.id === webhookRoute.jobId && job.jobType === "webhook_delivery"
    );
    if (failedJob?.status !== "failed") throw new Error("Failed webhook delivery was not retained for retry.");

    const replay = await replayWebhook(
      authedRequest(`http://localhost/api/webhooks/${webhookPayload.data.webhook.id}/replay`, orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json", "idempotency-key": "notification-smoke-replay-001" },
        body: JSON.stringify({ jobId: failedJob.id }),
      }),
      { params: Promise.resolve({ id: webhookPayload.data.webhook.id }) }
    );
    if (!replay.ok) throw new Error("Webhook replay did not enqueue retry job.");

    const replayWorker = await runJobsWorker(
      authedRequest("http://localhost/api/jobs/worker?max=1", orgId, { method: "POST" })
    );
    if (!replayWorker.ok) throw new Error("Webhook replay worker did not deliver successfully.");
    if (deliveries.length !== 2) throw new Error("Expected one failed and one successful local webhook delivery.");
    const lastDelivery = deliveries[1];
    if (lastDelivery.headers["x-operatorlayer-event-type"] !== "runtime_governance.decision") {
      throw new Error("Delivered webhook event type was incorrect.");
    }
    if (!String(lastDelivery.headers["x-operatorlayer-signature"] ?? "").startsWith("v1=")) {
      throw new Error("Delivered webhook was not signed.");
    }
    if (lastDelivery.body.includes("No risk at all")) {
      throw new Error("Webhook notification payload exposed raw draft text.");
    }

    const audit = await listAuditEvents(
      authedRequest("http://localhost/api/audit/events?limit=100", orgId)
    );
    if (!audit.ok) throw new Error("Failed to list notification routing audit events.");
    const auditPayload = (await audit.json()) as { data: { events: Array<{ action: string }> } };
    for (const action of [
      "enterprise:notification_route_recorded",
      "enterprise:webhook_delivery_attempt",
      "enterprise:webhook_replay_enqueued",
    ]) {
      if (!auditPayload.data.events.some((event) => event.action === action)) {
        throw new Error(`Missing audit action ${action}.`);
      }
    }

    console.log("notification-routing-smoke:ok");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
