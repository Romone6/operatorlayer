import { NextRequest } from "next/server";

import { getRequestContext } from "@/lib/auth/context";
import { resolveConnectorAvailabilityCatalog } from "@/lib/enterprise/connector-availability";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const repository = getRepository();
    const providers = await resolveConnectorAvailabilityCatalog(repository, context.organisationId);
    return jsonOk(providers);
  } catch (error) {
    return jsonError(error);
  }
}
