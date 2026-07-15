import { NextRequest } from "next/server";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { appendEnterpriseEvent, resolveBillingEntitlement } from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { z } from "zod";

const entitlementPatchSchema = z.object({
  plan: z.enum(["starter", "growth", "enterprise"]).optional(),
  seatsLimit: z.number().int().positive().optional(),
  evaluationsMonthlyLimit: z.number().int().positive().optional(),
  sourcesMonthlyLimit: z.number().int().positive().optional(),
  connectorLimit: z.number().int().positive().optional(),
  autoSendEnabled: z.boolean().optional(),
  apiAccessEnabled: z.boolean().optional(),
  mcpAccessEnabled: z.boolean().optional(),
  status: z.enum(["active", "past_due", "suspended"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const repository = getRepository();
    const entitlement = await resolveBillingEntitlement(repository, context.organisationId);
    return jsonOk(entitlement);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "billing-admin");
    const repository = getRepository();
    const patch = entitlementPatchSchema.parse(await request.json());
    const current = await resolveBillingEntitlement(repository, context.organisationId);
    const next = {
      ...current,
      ...patch,
      organisationId: context.organisationId,
      updatedAt: new Date().toISOString(),
    };
    await appendEnterpriseEvent(repository, context, {
      action: "billing_entitlement_upsert",
      payload: next,
    });
    return jsonOk(next);
  } catch (error) {
    return jsonError(error);
  }
}
