import { NextRequest } from "next/server";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { rotateWebhookSecret } from "@/lib/enterprise/store";
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
    const payload = await rotateWebhookSecret(repository, context, id);
    return jsonOk(payload);
  } catch (error) {
    return jsonError(error);
  }
}
