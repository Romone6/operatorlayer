import { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestContext } from "@/lib/auth/context";
import { assertRole } from "@/lib/auth/authorization";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

const settingsPatchSchema = z.object({
  organisation: z
    .object({
      name: z.string().min(2).optional(),
      industry: z.string().nullable().optional(),
      riskTolerance: z.string().min(2).optional(),
      autoSendAllowed: z.boolean().optional(),
    })
    .optional(),
  controls: z
    .object({
      defaultTone: z.string().min(2).optional(),
      pricingApprovalThreshold: z.number().min(0).max(100).optional(),
      refundApprovalThreshold: z.number().min(0).optional(),
      dataRetentionDays: z.number().min(1).max(3650).optional(),
      modelProvider: z.string().min(2).optional(),
    })
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const repository = getRepository();
    const [organisation, controls] = await Promise.all([
      repository.getOrganisation(context.organisationId),
      repository.getOrganisationSettings(context.organisationId),
    ]);
    if (!organisation) {
      throw new AppError(404, "organisation_not_found", "Organisation was not found.");
    }
    return jsonOk({ organisation, controls });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    const body = settingsPatchSchema.parse(await request.json());
    const repository = getRepository();
    const [organisation, controls] = await Promise.all([
      repository.updateOrganisation(context.organisationId, body.organisation ?? {}),
      repository.upsertOrganisationSettings(context.organisationId, body.controls ?? {}),
    ]);
    if (!organisation) {
      throw new AppError(404, "organisation_not_found", "Organisation was not found.");
    }
    return jsonOk({ organisation, controls });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(new AppError(400, "invalid_payload", "Invalid settings payload", error.flatten()));
    }
    return jsonError(error);
  }
}
