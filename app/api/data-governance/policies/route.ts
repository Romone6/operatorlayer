import { NextRequest } from "next/server";
import { z } from "zod";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { appendEnterpriseEvent, resolveGovernancePolicy } from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

const policyPatchSchema = z.object({
  retentionDays: z.number().int().min(7).max(3650),
  legalHoldEnabled: z.boolean(),
  deletionRequiresApproval: z.boolean(),
  invitePolicy: z.enum(["open", "domain_allowlist_only", "disabled"]),
  sessionDurationMinutes: z.number().int().min(15).max(43200),
  enforcedMfa: z.boolean(),
  breakGlassAdminEnabled: z.boolean(),
});

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "compliance-admin");
    const repository = getRepository();
    const policy = await resolveGovernancePolicy(repository, context.organisationId);
    return jsonOk(policy);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "compliance-admin");
    const payload = policyPatchSchema.parse(await request.json());
    const repository = getRepository();
    await appendEnterpriseEvent(repository, context, {
      action: "governance_policy_upsert",
      payload: {
        ...payload,
        updatedAt: new Date().toISOString(),
      },
    });
    const policy = await resolveGovernancePolicy(repository, context.organisationId);
    return jsonOk(policy);
  } catch (error) {
    return jsonError(error);
  }
}
