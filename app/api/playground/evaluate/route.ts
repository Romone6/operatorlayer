import { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestContext } from "@/lib/auth/context";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { evaluateDraft, generateScenarioGuidance } from "@/lib/services/playground";

const schema = z.object({
  inputMessage: z.string().min(5),
  draft: z.string().min(5),
});

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = schema.parse(await request.json());
    const repository = getRepository();
    const guidance = await generateScenarioGuidance(repository, context.organisationId, body.inputMessage);
    const policies = await repository.listPolicies(context.organisationId);
    const evaluation = await evaluateDraft({
      draft: body.draft,
      guidance,
      policies,
    });
    return jsonOk({ guidance, evaluation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(new AppError(400, "invalid_payload", "Invalid payload", error.flatten()));
    }
    return jsonError(error);
  }
}
