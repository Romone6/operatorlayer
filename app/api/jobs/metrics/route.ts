import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { buildJobMetrics } from "@/lib/enterprise/job-metrics";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    const repository = getRepository();

    const windowHoursParam = request.nextUrl.searchParams.get("windowHours");
    const windowHours = windowHoursParam ? Number(windowHoursParam) : 24;
    if (!Number.isFinite(windowHours) || windowHours < 1 || windowHours > 24 * 30) {
      throw new AppError(
        400,
        "invalid_window_hours",
        "Query parameter 'windowHours' must be a number between 1 and 720."
      );
    }

    const jobs = await repository.listJobs(context.organisationId);
    const metrics = buildJobMetrics({
      jobs,
      windowHours,
    });
    return jsonOk(metrics);
  } catch (error) {
    return jsonError(error);
  }
}
