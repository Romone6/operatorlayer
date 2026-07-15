import { NextRequest } from "next/server";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { appendEnterpriseEvent, resolveBillingEntitlement } from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ providerEventId: string }> }
) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "billing-admin");
    const repository = getRepository();
    const { providerEventId } = await params;

    const logs = await repository.listIngestionLogs(context.organisationId);
    const sourceEvent = logs.find(
      (item) =>
        item.action === "enterprise:billing_stripe_event_received" &&
        String(item.details.eventId ?? "") === providerEventId
    );
    if (!sourceEvent) {
      return jsonOk({
        providerEventId,
        reconciled: false,
        reason: "provider_event_not_found",
      });
    }

    const entitlementSource = logs
      .filter((item) => item.action === "enterprise:billing_entitlement_upsert")
      .filter((item) => String(item.details.reconciliationEventId ?? "") === providerEventId)
      .at(-1);
    const entitlement = entitlementSource
      ? (entitlementSource.details as Record<string, unknown>)
      : await resolveBillingEntitlement(repository, context.organisationId);

    await appendEnterpriseEvent(repository, context, {
      action: "billing_entitlement_upsert",
      payload: {
        ...entitlement,
        reconciliationEventId: providerEventId,
        reconciliationSource: "provider_event_reconcile",
        updatedAt: new Date().toISOString(),
      },
    });

    return jsonOk({
      providerEventId,
      reconciled: true,
      sourceEventType: String(sourceEvent.details.eventType ?? "unknown"),
      entitlement,
    });
  } catch (error) {
    return jsonError(error);
  }
}
