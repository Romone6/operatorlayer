import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createOrganisation } from "@/app/api/organisations/route";
import { POST as stripeWebhook } from "@/app/api/billing/stripe/webhook/route";
import { GET as getBillingEntitlement } from "@/app/api/billing/entitlements/route";
import { POST as reconcileBilling } from "@/app/api/billing/reconcile/route";
import { POST as reconcileBillingEvent } from "@/app/api/billing/reconcile/[providerEventId]/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

function authedRequest(url: string, orgId: string, init: RequestInit = {}, role = "owner") {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "test-user-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", role);
  return new NextRequest(url, { ...init, headers });
}

async function createOrg() {
  const request = new NextRequest("http://localhost/api/organisations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": "test-user-001",
    },
    body: JSON.stringify({ name: "Stripe Billing Org", industry: "SaaS" }),
  });
  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

function stripeSignedRequest(event: Record<string, unknown>, secret: string) {
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

function stripeEvent(input: {
  id: string;
  type: string;
  organisationId: string;
  plan: "starter" | "growth" | "enterprise";
  status?: string;
}) {
  return {
    id: input.id,
    type: input.type,
    data: {
      object: {
        id: `${input.type}-obj`,
        status: input.status ?? "active",
        metadata: {
          organisationId: input.organisationId,
          plan: input.plan,
        },
      },
    },
  };
}

describe("stripe billing lifecycle + reconciliation", () => {
  beforeEach(() => {
    resetMemoryRepository();
    process.env.STRIPE_SECRET_KEY = "test-stripe-secret";
    process.env.STRIPE_WEBHOOK_SECRET = "test-stripe-webhook-secret";
  });

  it("handles lifecycle transitions, webhook replay safety, and event reconciliation", async () => {
    const orgId = await createOrg();
    const secret = process.env.STRIPE_WEBHOOK_SECRET!;

    const checkoutEvent = stripeEvent({
      id: "evt_checkout_001",
      type: "checkout.session.completed",
      organisationId: orgId,
      plan: "growth",
      status: "complete",
    });
    const checkoutResponse = await stripeWebhook(stripeSignedRequest(checkoutEvent, secret));
    expect(checkoutResponse.status).toBe(200);
    const checkoutPayload = (await checkoutResponse.json()) as {
      data: { replay: boolean; entitlement: { plan: string; status: string } };
    };
    expect(checkoutPayload.data.replay).toBe(false);
    expect(checkoutPayload.data.entitlement.plan).toBe("growth");
    expect(checkoutPayload.data.entitlement.status).toBe("active");

    const checkoutReplayResponse = await stripeWebhook(stripeSignedRequest(checkoutEvent, secret));
    expect(checkoutReplayResponse.status).toBe(200);
    const checkoutReplayPayload = (await checkoutReplayResponse.json()) as {
      data: { replay: boolean };
    };
    expect(checkoutReplayPayload.data.replay).toBe(true);

    const failedInvoiceEvent = stripeEvent({
      id: "evt_invoice_failed_001",
      type: "invoice.payment_failed",
      organisationId: orgId,
      plan: "growth",
      status: "past_due",
    });
    const failedInvoiceResponse = await stripeWebhook(stripeSignedRequest(failedInvoiceEvent, secret));
    expect(failedInvoiceResponse.status).toBe(200);
    const failedInvoicePayload = (await failedInvoiceResponse.json()) as {
      data: { entitlement: { status: string } };
    };
    expect(failedInvoicePayload.data.entitlement.status).toBe("past_due");

    const cancelledSubscriptionEvent = stripeEvent({
      id: "evt_subscription_deleted_001",
      type: "customer.subscription.deleted",
      organisationId: orgId,
      plan: "growth",
      status: "canceled",
    });
    const cancelledSubscriptionResponse = await stripeWebhook(
      stripeSignedRequest(cancelledSubscriptionEvent, secret)
    );
    expect(cancelledSubscriptionResponse.status).toBe(200);
    const cancelledSubscriptionPayload = (await cancelledSubscriptionResponse.json()) as {
      data: { entitlement: { status: string } };
    };
    expect(cancelledSubscriptionPayload.data.entitlement.status).toBe("suspended");

    const currentEntitlementResponse = await getBillingEntitlement(
      authedRequest("http://localhost/api/billing/entitlements", orgId)
    );
    expect(currentEntitlementResponse.status).toBe(200);
    const currentEntitlementPayload = (await currentEntitlementResponse.json()) as {
      data: { plan: string; status: string };
    };
    expect(currentEntitlementPayload.data.plan).toBe("growth");
    expect(currentEntitlementPayload.data.status).toBe("suspended");

    const missingReconcileEventResponse = await reconcileBillingEvent(
      authedRequest("http://localhost/api/billing/reconcile/evt_missing", orgId, { method: "POST" }),
      { params: Promise.resolve({ providerEventId: "evt_missing" }) }
    );
    expect(missingReconcileEventResponse.status).toBe(200);
    const missingReconcilePayload = (await missingReconcileEventResponse.json()) as {
      data: { reconciled: boolean; reason: string };
    };
    expect(missingReconcilePayload.data.reconciled).toBe(false);
    expect(missingReconcilePayload.data.reason).toBe("provider_event_not_found");

    const reconcileEventResponse = await reconcileBillingEvent(
      authedRequest(
        "http://localhost/api/billing/reconcile/evt_invoice_failed_001",
        orgId,
        { method: "POST" }
      ),
      { params: Promise.resolve({ providerEventId: "evt_invoice_failed_001" }) }
    );
    expect(reconcileEventResponse.status).toBe(200);
    const reconcileEventPayload = (await reconcileEventResponse.json()) as {
      data: { reconciled: boolean; sourceEventType: string };
    };
    expect(reconcileEventPayload.data.reconciled).toBe(true);
    expect(reconcileEventPayload.data.sourceEventType).toBe("invoice.payment_failed");

    const reconcileResponse = await reconcileBilling(
      authedRequest("http://localhost/api/billing/reconcile?apply=1", orgId, { method: "POST" })
    );
    expect(reconcileResponse.status).toBe(200);
    const reconcilePayload = (await reconcileResponse.json()) as {
      data: { applied: boolean; driftDetected: boolean; recommendation: string };
    };
    expect(reconcilePayload.data.applied).toBe(true);
    expect(typeof reconcilePayload.data.driftDetected).toBe("boolean");
    expect(typeof reconcilePayload.data.recommendation).toBe("string");
  });
});
