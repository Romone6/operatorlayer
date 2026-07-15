import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { buildReadinessBoard } from "@/lib/enterprise/readiness-board";
import { resolveEnterpriseReadiness } from "@/lib/enterprise/readiness";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    const repository = getRepository();
    const [readiness, jobs] = await Promise.all([
      resolveEnterpriseReadiness(repository, context.organisationId),
      repository.listJobs(context.organisationId),
    ]);

    return jsonOk(
      buildReadinessBoard({
        blockers: readiness.blockers,
        jobs,
        organisationId: context.organisationId,
      })
    );
  } catch (error) {
    return jsonError(error);
  }
}
