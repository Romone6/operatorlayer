import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { resolveEnterpriseReadiness } from "@/lib/enterprise/readiness";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    const repository = getRepository();
    const readiness = await resolveEnterpriseReadiness(repository, context.organisationId);
    return jsonOk(readiness);
  } catch (error) {
    return jsonError(error);
  }
}
