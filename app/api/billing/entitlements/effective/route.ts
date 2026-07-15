import { NextRequest } from "next/server";

import { getRequestContext } from "@/lib/auth/context";
import { resolveBillingEntitlement } from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import type { BillingEntitlementState } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const repository = getRepository();
    const entitlement = await resolveBillingEntitlement(repository, context.organisationId);
    const baseState = {
      organisationId: entitlement.organisationId,
      plan: entitlement.plan,
      updatedAt: entitlement.updatedAt,
      capabilities: {
        apiAccessEnabled: entitlement.apiAccessEnabled,
        autoSendEnabled: entitlement.autoSendEnabled,
        mcpAccessEnabled: entitlement.mcpAccessEnabled,
      },
      limits: {
        seats: entitlement.seatsLimit,
        sourcesMonthly: entitlement.sourcesMonthlyLimit,
        evaluationsMonthly: entitlement.evaluationsMonthlyLimit,
        connectors: entitlement.connectorLimit,
      },
    };
    const state: BillingEntitlementState =
      entitlement.status === "active"
        ? {
            ...baseState,
            state: "active",
            status: "active",
            enforcement: "granted",
          }
        : entitlement.status === "past_due"
          ? {
              ...baseState,
              state: "past_due",
              status: "past_due",
              enforcement: "payment_required",
            }
          : {
              ...baseState,
              state: "suspended",
              status: "suspended",
              enforcement: "suspended",
            };

    return jsonOk({
      effectiveAt: new Date().toISOString(),
      entitlement,
      state,
      flags: state.capabilities,
      limits: state.limits,
    });
  } catch (error) {
    return jsonError(error);
  }
}
