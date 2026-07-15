import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { runDynamicTestSuite } from "@/lib/services/dynamic-testing";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin", "reviewer"]);
    const { id } = await params;
    const repository = getRepository();
    const result = await runDynamicTestSuite(repository, context.organisationId, context.userId, id);
    if (!result) {
      throw new AppError(404, "dynamic_test_suite_not_found", "Dynamic test suite not found.");
    }
    return jsonOk(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}
