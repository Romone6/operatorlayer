import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { resolveEnterpriseCapabilityStatus } from "@/lib/enterprise/capability-status";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    const repository = getRepository();
    return jsonOk(await resolveEnterpriseCapabilityStatus(repository, context.organisationId));
  } catch (error) {
    return jsonError(error);
  }
}
