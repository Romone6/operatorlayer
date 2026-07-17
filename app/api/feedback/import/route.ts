import { NextRequest } from "next/server";
import { z } from "zod";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

const recordSchema = z.object({
  scenarioId: z.string().uuid().nullable().optional(), evaluationId: z.string().uuid().nullable().optional(),
  outcome: z.enum(["accepted", "edited", "rejected", "escalated"]), rationale: z.string().trim().min(1).max(10_000),
  correctedDraft: z.string().trim().max(20_000).nullable().optional(),
});
const importSchema = z.object({ records: z.array(recordSchema).min(1).max(100) });

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin", "reviewer"]);
    const input = importSchema.parse(await request.json());
    const repository = getRepository();
    const records = await Promise.all(input.records.map((record) => repository.createFeedback({
      organisationId: context.organisationId, scenarioId: record.scenarioId ?? null, evaluationId: record.evaluationId ?? null,
      outcome: record.outcome, rationale: record.rationale, correctedDraft: record.correctedDraft ?? null,
      source: "import", createdBy: context.userId,
    })));
    return jsonOk({ imported: records.length }, 201);
  } catch (error) { return jsonError(error instanceof z.ZodError ? new AppError(400, "invalid_payload", "Invalid feedback import", error.flatten()) : error); }
}
