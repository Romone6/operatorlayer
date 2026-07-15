import { NextRequest } from "next/server";
import { z } from "zod";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { reviewCalibrationRecommendation } from "@/lib/services/dynamic-testing";

type Params = { params: Promise<{ id: string }> };

const reviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewNote: z.string().max(1000).optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    const { id } = await params;
    const payload = reviewSchema.parse(await request.json());
    const repository = getRepository();
    const recommendation = await reviewCalibrationRecommendation(
      repository,
      context.organisationId,
      context.userId,
      context.role,
      id,
      payload.status,
      payload.reviewNote ?? null
    );
    if (!recommendation) {
      throw new AppError(404, "calibration_recommendation_not_found", "Calibration recommendation not found.");
    }
    return jsonOk(recommendation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(new AppError(400, "invalid_payload", "Invalid payload", error.flatten()));
    }
    return jsonError(error);
  }
}
