import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { appendEnterpriseEvent, resolveApprovalRules } from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { approvalRuleSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin", "reviewer"]);
    const repository = getRepository();
    const { id } = await params;
    const payload = approvalRuleSchema.partial().parse(await request.json());
    const existing = await resolveApprovalRules(repository, context.organisationId);
    const target = existing.find((rule) => rule.id === id);
    if (!target) {
      throw new AppError(404, "approval_rule_not_found", "Approval rule not found.");
    }
    const updated = {
      ...target,
      ...payload,
      updatedBy: context.userId,
      updatedAt: new Date().toISOString(),
    };
    await appendEnterpriseEvent(repository, context, {
      action: "approval_rule_upsert",
      payload: updated,
    });
    return jsonOk(updated);
  } catch (error) {
    return jsonError(error);
  }
}
