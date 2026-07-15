import { NextRequest } from "next/server";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { appendEnterpriseEvent, resolveApiCredentials } from "@/lib/enterprise/store";
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
    const credentials = await resolveApiCredentials(repository, context.organisationId);
    const existing = credentials.find((item) => item.id === id);
    if (!existing) {
      throw new AppError(404, "api_key_not_found", "API key not found.");
    }
    await appendEnterpriseEvent(repository, context, {
      action: "api_key_revoked",
      payload: {
        id,
      },
    });
    return jsonOk({
      id,
      status: "revoked",
    });
  } catch (error) {
    return jsonError(error);
  }
}
