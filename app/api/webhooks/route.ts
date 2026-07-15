import { NextRequest } from "next/server";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { createWebhookSubscription, resolveWebhookSubscriptions } from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { webhookCreateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "api-admin");
    const repository = getRepository();
    const hooks = await resolveWebhookSubscriptions(repository, context.organisationId);
    return jsonOk(hooks);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "api-admin");
    const repository = getRepository();
    const payload = webhookCreateSchema.parse(await request.json());
    const { record, secret } = await createWebhookSubscription(repository, context, payload);
    return jsonOk(
      {
        webhook: record,
        secret,
      },
      201
    );
  } catch (error) {
    return jsonError(error);
  }
}
