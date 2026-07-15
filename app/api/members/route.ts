import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);

    const repository = getRepository();
    const members = await repository.listUsers(context.organisationId);
    return jsonOk(members);
  } catch (error) {
    return jsonError(error);
  }
}
