import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { decideAutoSend } from "@/lib/enterprise/send-policy";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { autoSendDecisionSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin", "reviewer", "analyst"]);
    const payload = autoSendDecisionSchema.parse(await request.json());
    const repository = getRepository();

    const decision = await decideAutoSend(repository, {
      organisationId: context.organisationId,
      score: payload.score,
      riskLevel: payload.riskLevel,
      scenarioId: payload.scenarioId,
      workspaceId: payload.workspaceId,
      channel: payload.channel,
      customerType: payload.customerType,
    });

    return jsonOk({
      decision,
      simulation: {
        status: decision.allowed ? "would_queue" : "would_block",
        reason: decision.reason,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
