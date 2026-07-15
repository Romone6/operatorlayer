import { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestContext } from "@/lib/auth/context";
import { assertRole } from "@/lib/auth/authorization";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { patchPolicySchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin", "reviewer"]);
    const { id } = await params;
    const patch = patchPolicySchema.parse(await request.json());
    const repository = getRepository();
    const policy = await repository.patchPolicy(context.organisationId, id, patch);
    if (!policy) {
      throw new AppError(404, "policy_not_found", "Policy was not found.");
    }
    return jsonOk(policy);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(new AppError(400, "invalid_payload", "Invalid payload", error.flatten()));
    }
    return jsonError(error);
  }
}

