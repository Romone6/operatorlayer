import { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestContext } from "@/lib/auth/context";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

const feedbackSchema = z.object({
  scenarioId: z.string().uuid().nullable().optional(), evaluationId: z.string().uuid().nullable().optional(),
  outcome: z.enum(["accepted", "edited", "rejected", "escalated"]), rationale: z.string().trim().min(1).max(10_000),
  correctedDraft: z.string().trim().max(20_000).nullable().optional(),
});

export async function GET(request: NextRequest) {
  try { const context = await getRequestContext(request); return jsonOk(await getRepository().listFeedback(context.organisationId)); }
  catch (error) { return jsonError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request); const input = feedbackSchema.parse(await request.json());
    return jsonOk(await getRepository().createFeedback({ organisationId: context.organisationId, scenarioId: input.scenarioId ?? null,
      evaluationId: input.evaluationId ?? null, outcome: input.outcome, rationale: input.rationale,
      correctedDraft: input.correctedDraft ?? null, source: "manual", createdBy: context.userId }), 201);
  } catch (error) { return jsonError(error instanceof z.ZodError ? new AppError(400, "invalid_payload", "Invalid feedback", error.flatten()) : error); }
}
