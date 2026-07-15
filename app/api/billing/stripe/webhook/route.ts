import { NextRequest } from "next/server";

import { assertStripeConfigured } from "@/lib/enterprise/config";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { verifyStripeSignature } from "@/lib/security/stripe-signature";

const planMap: Record<string, "starter" | "growth" | "enterprise"> = {
  starter: "starter",
  growth: "growth",
  enterprise: "enterprise",
};

function coercePlan(input: unknown) {
  return planMap[String(input ?? "starter")] ?? "starter";
}

function coerceEntitlementStatus(value: unknown): "active" | "past_due" | "suspended" {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "active" || normalized === "paid" || normalized === "trialing") return "active";
  if (normalized === "past_due" || normalized === "unpaid") return "past_due";
  return "suspended";
}

function resolveStripeMetadata(object: Record<string, unknown>) {
  const direct = (object.metadata as Record<string, unknown> | undefined) ?? {};
  const subscriptionDetails =
    ((object.subscription_details as Record<string, unknown> | undefined)?.metadata as
      | Record<string, unknown>
      | undefined) ?? {};
  return {
    organisationId: String(
      direct.organisationId ??
        subscriptionDetails.organisationId ??
        object.client_reference_id ??
        ""
    ),
    plan: coercePlan(direct.plan ?? subscriptionDetails.plan ?? "starter"),
  };
}

function resolveLifecycle(input: {
  eventType: string;
  objectStatus: string;
  invoiceStatus: string | null;
  subscriptionStatus: string | null;
}) {
  const eventType = input.eventType;
  const known = new Set([
    "checkout.session.completed",
    "checkout.session.expired",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.subscription.trial_will_end",
    "customer.subscription.paused",
    "customer.subscription.resumed",
    "invoice.created",
    "invoice.finalized",
    "invoice.paid",
    "invoice.payment_failed",
    "invoice.marked_uncollectible",
    "invoice.voided",
  ]);
  const lifecycleState = known.has(eventType) ? eventType : "unmapped_event";
  let entitlementStatus: "active" | "past_due" | "suspended" = coerceEntitlementStatus(
    input.subscriptionStatus ?? input.invoiceStatus ?? input.objectStatus
  );

  if (
    [
      "invoice.payment_failed",
      "invoice.marked_uncollectible",
      "customer.subscription.paused",
    ].includes(eventType)
  ) {
    entitlementStatus = "past_due";
  }
  if (
    [
      "customer.subscription.deleted",
      "invoice.voided",
      "checkout.session.expired",
    ].includes(eventType)
  ) {
    entitlementStatus = "suspended";
  }
  if (
    [
      "invoice.paid",
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.resumed",
      "customer.subscription.trial_will_end",
      "invoice.finalized",
      "invoice.created",
    ].includes(eventType)
  ) {
    entitlementStatus = "active";
  }

  return {
    entitlementStatus,
    lifecycleState,
    mapped: lifecycleState !== "unmapped_event",
  };
}

function entitlementFromPlan(input: {
  organisationId: string;
  plan: "starter" | "growth" | "enterprise";
  status: "active" | "past_due" | "suspended";
}) {
  const plan = input.plan;
  return {
    organisationId: input.organisationId,
    plan,
    seatsLimit: plan === "enterprise" ? 9999 : plan === "growth" ? 25 : 5,
    evaluationsMonthlyLimit: plan === "enterprise" ? 100000 : plan === "growth" ? 1000 : 200,
    sourcesMonthlyLimit: plan === "enterprise" ? 10000 : plan === "growth" ? 500 : 50,
    connectorLimit: plan === "enterprise" ? 50 : plan === "growth" ? 10 : 1,
    autoSendEnabled: plan !== "starter",
    apiAccessEnabled: plan !== "starter",
    mcpAccessEnabled: plan === "enterprise",
    status: input.status,
    updatedAt: new Date().toISOString(),
  } as const;
}

export async function POST(request: NextRequest) {
  try {
    assertStripeConfigured();
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      throw new AppError(401, "stripe_signature_missing", "Missing Stripe signature header.");
    }
    const rawBody = await request.text();
    verifyStripeSignature(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    const event = JSON.parse(rawBody) as Record<string, unknown>;
    const repository = getRepository();
    const eventId = String(event.id ?? "");
    const type = String(event.type ?? "");

    const data = (event.data as Record<string, unknown> | undefined) ?? {};
    const object = (data.object as Record<string, unknown> | undefined) ?? {};
    const { organisationId, plan } = resolveStripeMetadata(object);
    if (!organisationId) {
      throw new AppError(400, "stripe_org_missing", "Missing organisationId metadata in Stripe event.");
    }
    const existing = (await repository.listIngestionLogs(organisationId)).find(
      (item) =>
        item.action === "enterprise:billing_stripe_event_received" &&
        String(item.details.eventId ?? "") === eventId
    );
    if (existing && eventId) {
      return jsonOk({
        received: true,
        replay: true,
        eventId,
        eventType: type,
      });
    }

    const objectStatus = String(object.status ?? "active");
    const invoiceStatus = typeof object.status === "string" ? String(object.status) : null;
    const subscriptionStatus =
      typeof object.status === "string" ? String(object.status) : null;
    const lifecycle = resolveLifecycle({
      eventType: type,
      objectStatus,
      invoiceStatus,
      subscriptionStatus,
    });

    const entitlement = entitlementFromPlan({
      organisationId,
      plan,
      status: lifecycle.entitlementStatus,
    });

    await repository.createIngestionLog({
      organisationId,
      sourceId: null,
      action: "enterprise:billing_stripe_event_received",
      details: {
        eventId,
        eventType: type,
        objectStatus,
        invoiceStatus,
        subscriptionStatus,
        lifecycleState: lifecycle.lifecycleState,
        mapped: lifecycle.mapped,
        plan,
        actorId: "stripe_webhook",
      },
    });

    await repository.createIngestionLog({
      organisationId,
      sourceId: null,
      action: "enterprise:billing_entitlement_upsert",
      details: {
        ...entitlement,
        actorId: "stripe_webhook",
        reconciliationEventId: eventId || null,
        eventType: type,
        lifecycleState: lifecycle.lifecycleState,
        mapped: lifecycle.mapped,
        invoiceStatus,
        subscriptionStatus,
      },
    });

    return jsonOk({
      received: true,
      replay: false,
      eventId,
      eventType: type,
      entitlement,
      lifecycle,
    });
  } catch (error) {
    return jsonError(error);
  }
}
