import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { runNextQueuedJob } from "@/lib/services/jobs";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    const repository = getRepository();
    const maxParam = request.nextUrl.searchParams.get("max");
    const max = maxParam ? Number(maxParam) : 1;
    if (!Number.isFinite(max) || max < 1 || max > 50) {
      throw new AppError(400, "invalid_max", "Query parameter 'max' must be a number between 1 and 50.");
    }

    const processed: Array<Record<string, unknown>> = [];
    for (let index = 0; index < max; index += 1) {
      const result = await runNextQueuedJob(repository, context.organisationId);
      if (!result.processed) break;
      processed.push(result as Record<string, unknown>);
    }

    return jsonOk({
      processedCount: processed.length,
      results: processed,
    });
  } catch (error) {
    return jsonError(error);
  }
}
