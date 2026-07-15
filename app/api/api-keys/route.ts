import { NextRequest } from "next/server";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { createApiCredential, resolveApiCredentials } from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { apiKeyCreateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "api-admin");
    const repository = getRepository();
    const keys = await resolveApiCredentials(repository, context.organisationId);
    return jsonOk(keys);
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
    const payload = apiKeyCreateSchema.parse(await request.json());
    const { record, rawKey } = await createApiCredential(repository, context, payload);
    return jsonOk(
      {
        credential: record,
        rawKey,
      },
      201
    );
  } catch (error) {
    return jsonError(error);
  }
}
