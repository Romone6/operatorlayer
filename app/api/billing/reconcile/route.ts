import { NextRequest } from "next/server";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { appendEnterpriseEvent, resolveBillingEntitlement } from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "billing-admin");
    const repository = getRepository();
    const apply = request.nextUrl.searchParams.get("apply") === "1";

    const logs = await repository.listIngestionLogs(context.organisationId);
    const billingEvents = logs.filter((item) => item.action === "enterprise:billing_entitlement_upsert");
    const latest = billingEvents.at(-1);
    const latestStripeEvent = logs
      .filter((item) => item.action === "enterprise:billing_entitlement_upsert")
      .filter((item) => String(item.details.actorId ?? "") === "stripe_webhook")
      .at(-1);
    const current = await resolveBillingEntitlement(repository, context.organisationId);
    const stripeProjection = latestStripeEvent?.details as Record<string, unknown> | undefined;
    const driftFields = stripeProjection
      ? (["plan", "status", "seatsLimit", "evaluationsMonthlyLimit", "sourcesMonthlyLimit", "connectorLimit"] as const)
          .filter((field) => String((stripeProjection[field] ?? "")) !== String((current[field] ?? "")))
      : [];
    const driftDetected = driftFields.length > 0;
    const recommendation =
      current.status !== "active"
        ? "mark_investigation_required"
        : driftDetected
          ? "resolve_entitlement_drift"
          : current.plan === "starter"
          ? "confirm_plan_upgrade_if_enterprise_contract_signed"
          : "no_action";

    if (apply && (latestStripeEvent ?? latest)) {
      const source = (latestStripeEvent ?? latest)!;
      await appendEnterpriseEvent(repository, context, {
        action: "billing_entitlement_upsert",
        payload: {
          ...(source.details as Record<string, unknown>),
          reconciliationSource: "billing_reconcile_apply",
          updatedAt: new Date().toISOString(),
        },
      });
    }

    return jsonOk({
      current,
      billingEventCount: billingEvents.length,
      driftDetected,
      driftFields,
      recommendation,
      applied: apply && Boolean(latestStripeEvent ?? latest),
    });
  } catch (error) {
    return jsonError(error);
  }
}
