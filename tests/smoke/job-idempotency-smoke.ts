import { NextRequest } from "next/server";

function authedRequest(url: string, orgId: string, init: RequestInit = {}, role = "owner") {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "smoke-user-idempotency-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", role);
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

async function main() {
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = process.env.OPERATORLAYER_TEST_AUTH_BYPASS ?? "1";
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS ?? "1";
  process.env.OPERATORLAYER_DATA_BACKEND = process.env.OPERATORLAYER_DATA_BACKEND ?? "memory";
  process.env.OPERATORLAYER_PROCESSING_MODE = process.env.OPERATORLAYER_PROCESSING_MODE ?? "deterministic";
  process.env.OPERATORLAYER_SECRET_ENCRYPTION_KEY =
    process.env.OPERATORLAYER_SECRET_ENCRYPTION_KEY ?? "test-secret-encryption-key";

  const { POST: createOrganisation } = await import("@/app/api/organisations/route");
  const { POST: uploadSource } = await import("@/app/api/sources/upload/route");
  const { POST: processSource } = await import("@/app/api/sources/[id]/process/route");
  const { POST: createWebhook } = await import("@/app/api/webhooks/route");
  const { POST: dispatchWebhook } = await import("@/app/api/webhooks/dispatch/route");
  const { GET: getWebhookReplayHistory, POST: replayWebhook } = await import(
    "@/app/api/webhooks/[id]/replay/route"
  );
  const { resetMemoryRepository } = await import("@/lib/repository/memory");

  resetMemoryRepository();

  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "smoke-user-idempotency-001" },
      body: JSON.stringify({ name: "Idempotency Smoke Org", industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error("Failed to create organisation for idempotency smoke.");
  const org = (await create.json()) as { data: { id: string } };
  const orgId = org.data.id;

  const form = new FormData();
  form.set("title", "Idempotency Manual");
  form.set("sourceType", "pasted_text");
  form.set("authorityLevel", "standard");
  form.set("pastedText", "Price is too high. Based on what you shared, we can run a pilot.");
  const upload = await uploadSource(authedRequest("http://localhost/api/sources/upload", orgId, { method: "POST", body: form }));
  if (!upload.ok) throw new Error("Failed to upload source for idempotency smoke.");
  const uploadPayload = (await upload.json()) as { data: { id: string } };
  const sourceId = uploadPayload.data.id;

  const processRequest = () =>
    processSource(
      authedRequest(`http://localhost/api/sources/${sourceId}/process`, orgId, {
        method: "POST",
        headers: { "idempotency-key": "smoke-process-idempotency-001" },
      }),
      { params: Promise.resolve({ id: sourceId }) }
    );

  const firstProcess = await processRequest();
  if (!firstProcess.ok) throw new Error("First source process request failed.");
  const firstProcessPayload = (await firstProcess.json()) as { data: { jobId: string } };

  const secondProcess = await processRequest();
  if (!secondProcess.ok) throw new Error("Second source process request failed.");
  const secondProcessPayload = (await secondProcess.json()) as { data: { jobId: string } };
  if (secondProcessPayload.data.jobId !== firstProcessPayload.data.jobId) {
    throw new Error("Expected source process idempotency replay to return same job id.");
  }

  const webhookCreate = await createWebhook(
    authedRequest("http://localhost/api/webhooks", orgId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "https://example.com/webhooks/operatorlayer",
        events: ["evaluation.created"],
      }),
    })
  );
  if (!webhookCreate.ok) throw new Error("Failed to create webhook for idempotency smoke.");
  const webhookPayload = (await webhookCreate.json()) as { data: { webhook: { id: string } } };
  const webhookId = webhookPayload.data.webhook.id;

  const dispatchRequest = () =>
    dispatchWebhook(
      authedRequest("http://localhost/api/webhooks/dispatch", orgId, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "idempotency-key": "smoke-webhook-dispatch-idempotency-001",
        },
        body: JSON.stringify({
          eventType: "evaluation.created",
          payload: { id: "eval-smoke-001" },
        }),
      })
    );

  const firstDispatch = await dispatchRequest();
  if (!firstDispatch.ok) throw new Error("First webhook dispatch failed.");
  const firstDispatchPayload = (await firstDispatch.json()) as { data: { queuedJobs: string[] } };

  const secondDispatch = await dispatchRequest();
  if (!secondDispatch.ok) throw new Error("Second webhook dispatch failed.");
  const secondDispatchPayload = (await secondDispatch.json()) as { data: { queuedJobs: string[] } };
  if (JSON.stringify(firstDispatchPayload.data.queuedJobs) !== JSON.stringify(secondDispatchPayload.data.queuedJobs)) {
    throw new Error("Expected webhook dispatch idempotency replay to return same queued jobs.");
  }

  const replayHistory = await getWebhookReplayHistory(
    authedRequest(`http://localhost/api/webhooks/${webhookId}/replay`, orgId),
    { params: Promise.resolve({ id: webhookId }) }
  );
  if (!replayHistory.ok) throw new Error("Failed to list webhook replay history.");
  const replayHistoryPayload = (await replayHistory.json()) as { data: { replayable: Array<{ jobId: string }> } };
  const replaySourceJobId = replayHistoryPayload.data.replayable[0]?.jobId;
  if (!replaySourceJobId) throw new Error("No webhook replay source job id available.");

  const replayRequest = () =>
    replayWebhook(
      authedRequest(`http://localhost/api/webhooks/${webhookId}/replay`, orgId, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "idempotency-key": "smoke-webhook-replay-idempotency-001",
        },
        body: JSON.stringify({ jobId: replaySourceJobId }),
      }),
      { params: Promise.resolve({ id: webhookId }) }
    );

  const firstReplay = await replayRequest();
  if (!firstReplay.ok) throw new Error("First webhook replay enqueue failed.");
  const firstReplayPayload = (await firstReplay.json()) as { data: { replayJobId: string } };

  const secondReplay = await replayRequest();
  if (!secondReplay.ok) throw new Error("Second webhook replay enqueue failed.");
  const secondReplayPayload = (await secondReplay.json()) as { data: { replayJobId: string } };
  if (secondReplayPayload.data.replayJobId !== firstReplayPayload.data.replayJobId) {
    throw new Error("Expected webhook replay idempotency replay to return same replay job id.");
  }

  console.log("job-idempotency-smoke:ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
