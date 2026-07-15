import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { getNotificationDestinationStatus } from "@/lib/services/notifications";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin", "reviewer", "analyst"]);
    const repository = getRepository();
    const destinations = await getNotificationDestinationStatus(repository, context.organisationId);
    return jsonOk(destinations);
  } catch (error) {
    return jsonError(error);
  }
}
