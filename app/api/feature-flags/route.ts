import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { appendEnterpriseEvent, resolveFeatureFlags } from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { featureFlagPatchSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const repository = getRepository();
    const flags = await resolveFeatureFlags(repository, context.organisationId);
    return jsonOk(flags);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    const repository = getRepository();
    const payload = featureFlagPatchSchema.parse(await request.json());
    await appendEnterpriseEvent(repository, context, {
      action: "feature_flag_upsert",
      payload: {
        ...payload,
        updatedBy: context.userId,
      },
    });
    const flags = await resolveFeatureFlags(repository, context.organisationId);
    return jsonOk(flags);
  } catch (error) {
    return jsonError(error);
  }
}
