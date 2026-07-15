import crypto from "node:crypto";

import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { appendEnterpriseEvent, resolveApprovalRules } from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { approvalRuleSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const repository = getRepository();
    const rules = await resolveApprovalRules(repository, context.organisationId);
    return jsonOk(rules);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin", "reviewer"]);
    const repository = getRepository();
    const payload = approvalRuleSchema.parse(await request.json());
    const now = new Date().toISOString();
    const rule = {
      id: crypto.randomUUID(),
      organisationId: context.organisationId,
      ...payload,
      createdBy: context.userId,
      updatedBy: context.userId,
      createdAt: now,
      updatedAt: now,
    };
    await appendEnterpriseEvent(repository, context, {
      action: "approval_rule_upsert",
      payload: rule,
    });
    return jsonOk(rule, 201);
  } catch (error) {
    return jsonError(error);
  }
}
