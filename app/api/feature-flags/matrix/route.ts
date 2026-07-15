import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { buildFeatureFlagGovernanceMatrix } from "@/lib/enterprise/feature-flag-governance";
import { resolveFeatureFlags } from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    const repository = getRepository();
    const flags = await resolveFeatureFlags(repository, context.organisationId);
    return jsonOk(buildFeatureFlagGovernanceMatrix(flags));
  } catch (error) {
    return jsonError(error);
  }
}
