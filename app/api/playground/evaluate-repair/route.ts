import { NextRequest } from "next/server";

import { getRequestContext } from "@/lib/auth/context";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { evaluateAndRepairDraft } from "@/lib/services/playground";
import { playgroundRequestSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = playgroundRequestSchema.parse(await request.json());
    const repository = getRepository();
    const result = await evaluateAndRepairDraft({
      repository,
      organisationId: context.organisationId,
      inputMessage: body.inputMessage,
      channel: body.channel,
      team: body.team,
      customerType: body.customerType,
      context: body.context,
      draft: body.draft,
    });
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
