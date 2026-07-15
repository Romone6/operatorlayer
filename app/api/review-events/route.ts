import { NextRequest } from "next/server";

import { getRequestContext } from "@/lib/auth/context";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const repository = getRepository();
    const events = await repository.listReviewEvents(context.organisationId);
    return jsonOk(events);
  } catch (error) {
    return jsonError(error);
  }
}
