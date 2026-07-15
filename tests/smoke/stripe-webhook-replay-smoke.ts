import crypto from "node:crypto";

import { NextRequest } from "next/server";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "smoke-user-stripe-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

function signedStripeRequest(event: Record<string, unknown>, secret: string) {
  const payload = JSON.stringify(event);
  const timestamp = "1700000000";
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  return new NextRequest("http://localhost/api/billing/stripe/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": `t=${timestamp},v1=${signature}`,
    },
    body: payload,
  });
}

async function main() {
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = process.env.OPERATORLAYER_TEST_AUTH_BYPASS ?? "1";
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS ?? "1";
  process.env.OPERATORLAYER_DATA_BACKEND = process.env.OPERATORLAYER_DATA_BACKEND ?? "memory";
  process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "test-stripe-secret";
  process.env.STRIPE_WEBHOOK_SECRET =
    process.env.STRIPE_WEBHOOK_SECRET ?? "test-stripe-webhook-secret";

  const { POST: createOrganisation } = await import("@/app/api/organisations/route");
  const { POST: stripeWebhook } = await import("@/app/api/billing/stripe/webhook/route");
  const { POST: reconcileEvent } = await import("@/app/api/billing/reconcile/[providerEventId]/route");
  const { resetMemoryRepository } = await import("@/lib/repository/memory");

  resetMemoryRepository();

  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "smoke-user-stripe-001" },
      body: JSON.stringify({ name: "Stripe Smoke Org", industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error("Failed to create organisation for Stripe smoke.");
  const org = (await create.json()) as { data: { id: string } };
  const orgId = org.data.id;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  const event = {
    id: "evt_smoke_checkout_001",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_smoke_001",
        status: "complete",
        metadata: {
          organisationId: orgId,
          plan: "growth",
        },
      },
    },
  };

  const first = await stripeWebhook(signedStripeRequest(event, webhookSecret));
  if (!first.ok) throw new Error("Stripe webhook initial event failed.");
  const firstPayload = (await first.json()) as { data: { replay: boolean } };
  if (firstPayload.data.replay) {
    throw new Error("Expected first webhook delivery to be non-replay.");
  }

  const replay = await stripeWebhook(signedStripeRequest(event, webhookSecret));
  if (!replay.ok) throw new Error("Stripe webhook replay event failed.");
  const replayPayload = (await replay.json()) as { data: { replay: boolean } };
  if (!replayPayload.data.replay) {
    throw new Error("Expected second webhook delivery to be replay.");
  }

  const reconcile = await reconcileEvent(
    authedRequest("http://localhost/api/billing/reconcile/evt_smoke_checkout_001", orgId, {
      method: "POST",
    }),
    { params: Promise.resolve({ providerEventId: "evt_smoke_checkout_001" }) }
  );
  if (!reconcile.ok) throw new Error("Stripe provider-event reconcile failed.");
  const reconcilePayload = (await reconcile.json()) as {
    data: { reconciled: boolean; reason?: string; sourceEventType?: string };
  };
  if (!reconcilePayload.data.reconciled) {
    throw new Error(
      `Expected provider-event reconcile to return reconciled=true. Payload=${JSON.stringify(
        reconcilePayload.data
      )}`
    );
  }

  console.log("stripe-webhook-replay-smoke:ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
