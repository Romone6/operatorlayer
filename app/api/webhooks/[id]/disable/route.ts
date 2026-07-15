import { NextRequest } from "next/server";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { appendEnterpriseEvent, resolveWebhookSubscriptions } from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "api-admin");
    const repository = getRepository();
    const { id } = await params;
    const existing = await resolveWebhookSubscriptions(repository, context.organisationId);
    if (!existing.some((item) => item.id === id)) {
      throw new AppError(404, "webhook_not_found", "Webhook subscription not found.");
    }
    await appendEnterpriseEvent(repository, context, {
      action: "webhook_disabled",
      payload: { id },
    });
    return jsonOk({ id, status: "disabled" });
  } catch (error) {
    return jsonError(error);
  }
}
