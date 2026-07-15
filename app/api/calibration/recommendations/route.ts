import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { listCalibrationRecommendations } from "@/lib/services/dynamic-testing";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin", "reviewer", "analyst"]);
    const repository = getRepository();
    const recommendations = await listCalibrationRecommendations(repository, context.organisationId);
    return jsonOk(recommendations);
  } catch (error) {
    return jsonError(error);
  }
}
