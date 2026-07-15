import { NextRequest } from "next/server";

import { getRequestContext } from "@/lib/auth/context";
import { buildEvaluationExplainabilityPack } from "@/lib/enterprise/evaluation-explainability";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getRequestContext(request);
    const { id } = await params;
    const repository = getRepository();
    const evaluations = await repository.listEvaluations(context.organisationId);
    const record = evaluations.find((item) => item.id === id);
    if (!record) {
      throw new AppError(404, "evaluation_not_found", "Evaluation record not found.");
    }
    return jsonOk(buildEvaluationExplainabilityPack(record));
  } catch (error) {
    return jsonError(error);
  }
}
