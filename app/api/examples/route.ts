import { NextRequest } from "next/server";
import { z } from "zod";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

const createExampleSchema = z.object({
  scenarioId: z.string().uuid().nullable().optional(),
  evaluationId: z.string().uuid().nullable().optional(),
  exampleType: z.enum(["approved", "rejected"]),
  inputMessage: z.string().trim().min(1).max(20_000),
  responseText: z.string().trim().min(1).max(20_000),
  rationale: z.string().trim().min(1).max(10_000),
});

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    return jsonOk(await getRepository().listReviewedExamples(context.organisationId));
  } catch (error) { return jsonError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin", "reviewer"]);
    const input = createExampleSchema.parse(await request.json());
    return jsonOk(await getRepository().createReviewedExample({
      organisationId: context.organisationId, scenarioId: input.scenarioId ?? null, evaluationId: input.evaluationId ?? null,
      exampleType: input.exampleType, inputMessage: input.inputMessage, responseText: input.responseText,
      rationale: input.rationale, reviewedBy: context.userId,
    }), 201);
  } catch (error) {
    return jsonError(error instanceof z.ZodError ? new AppError(400, "invalid_payload", "Invalid reviewed example", error.flatten()) : error);
  }
}
