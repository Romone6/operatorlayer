import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import {
  generateDynamicTestSuite,
  listDynamicTestSuites,
  persistDynamicTestSuite,
} from "@/lib/services/dynamic-testing";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin", "reviewer", "analyst"]);
    const repository = getRepository();
    const suites = await listDynamicTestSuites(repository, context.organisationId);
    return jsonOk(suites);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin", "reviewer"]);
    const repository = getRepository();
    const suite = await generateDynamicTestSuite(repository, context.organisationId, context.userId);
    await persistDynamicTestSuite(repository, context.organisationId, context.userId, suite);
    return jsonOk(suite, 201);
  } catch (error) {
    return jsonError(error);
  }
}
