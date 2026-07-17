import { NextRequest } from "next/server";

import { getRequestContext } from "@/lib/auth/context";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const evaluations = await getRepository().listEvaluations(context.organisationId);
    return jsonOk({
      evaluationCount: evaluations.length,
      averageScore: evaluations.length ? Math.round(evaluations.reduce((sum, item) => sum + item.scores.total, 0) / evaluations.length) : null,
      repairRequiredCount: evaluations.filter((item) => item.repairRequired).length,
      approvalRequiredCount: evaluations.filter((item) => item.approvalRequired).length,
    });
  } catch (error) { return jsonError(error); }
}
