import { NextRequest } from "next/server";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "smoke-user-webhook-events-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

async function main() {
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = process.env.OPERATORLAYER_TEST_AUTH_BYPASS ?? "1";
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS ?? "1";
  process.env.OPERATORLAYER_DATA_BACKEND = process.env.OPERATORLAYER_DATA_BACKEND ?? "memory";
  process.env.OPERATORLAYER_SECRET_ENCRYPTION_KEY =
    process.env.OPERATORLAYER_SECRET_ENCRYPTION_KEY ?? "test-secret-encryption-key";

  const { POST: createOrganisation } = await import("@/app/api/organisations/route");
  const { POST: createWebhook } = await import("@/app/api/webhooks/route");
  const { POST: dispatchWebhook } = await import("@/app/api/webhooks/dispatch/route");
  const { resetMemoryRepository } = await import("@/lib/repository/memory");

  resetMemoryRepository();

  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "smoke-user-webhook-events-001" },
      body: JSON.stringify({ name: "Webhook Event Subscription Smoke Org", industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error("Failed to create organisation for webhook event subscription smoke.");
  const org = (await create.json()) as { data: { id: string } };
  const orgId = org.data.id;

  const createHook = async (endpoint: string, events: string[]) => {
    const response = await createWebhook(
      authedRequest("http://localhost/api/webhooks", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, events }),
      })
    );
    if (!response.ok) throw new Error(`Failed to create webhook for events: ${events.join(",")}`);
  };

  await createHook("https://example.com/hooks/evaluation", ["evaluation.created"]);
  await createHook("https://example.com/hooks/send-event", ["send_event.*"]);
  await createHook("https://example.com/hooks/all", ["*"]);

  const evaluationDispatch = await dispatchWebhook(
    authedRequest("http://localhost/api/webhooks/dispatch", orgId, {
      method: "POST",
      headers: { "Content-Type": "application/json", "idempotency-key": "smoke-dispatch-evaluation-001" },
      body: JSON.stringify({
        eventType: "evaluation.created",
        payload: { id: "eval-smoke-001" },
      }),
    })
  );
  if (!evaluationDispatch.ok) throw new Error("Failed to dispatch evaluation.created event.");
  const evaluationPayload = (await evaluationDispatch.json()) as {
    data: { queuedCount: number };
  };
  if (evaluationPayload.data.queuedCount !== 2) {
    throw new Error(`Expected 2 subscribed webhooks for evaluation.created, got ${evaluationPayload.data.queuedCount}.`);
  }

  const sendEventDispatch = await dispatchWebhook(
    authedRequest("http://localhost/api/webhooks/dispatch", orgId, {
      method: "POST",
      headers: { "Content-Type": "application/json", "idempotency-key": "smoke-dispatch-send-event-001" },
      body: JSON.stringify({
        eventType: "send_event.created",
        payload: { id: "send-smoke-001" },
      }),
    })
  );
  if (!sendEventDispatch.ok) throw new Error("Failed to dispatch send_event.created event.");
  const sendEventPayload = (await sendEventDispatch.json()) as { data: { queuedCount: number } };
  if (sendEventPayload.data.queuedCount !== 2) {
    throw new Error(`Expected 2 subscribed webhooks for send_event.created, got ${sendEventPayload.data.queuedCount}.`);
  }

  console.log("webhook-event-subscriptions-smoke:ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
